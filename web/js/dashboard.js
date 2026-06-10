// dashboard.js - Orquestração principal

class DashboardApp {
    constructor() {
        this.vehicles = new Map();
        this.selectedVehicle = null;
        
        this.init();
    }

    async init() {
        console.log("Iniciando FleetTracker Dashboard...");
        
        // Registrar callbacks do MQTT (arrow function para preservar o contexto async)
        mqttClient.onTelemetry = (vehicleId, type, payload) => {
            this.handleTelemetry(vehicleId, type, payload);
        };
        mqttClient.onStatus = this.handleStatus.bind(this);
        mqttClient.onAlert = this.handleAlert.bind(this);
        mqttClient.onCommandResponse = this.handleCommandResponse.bind(this);
        
        // Conectar ao broker
        mqttClient.connect();

        // Registrar callback do mapa
        mapClient.onMarkerClick = this.selectVehicle.bind(this);

        // Carregar posições iniciais do DB (se disponível)
        const history = await db.loadInitialPositions();
        history.forEach(pos => {
            this.handleTelemetry(pos.vehicle_id, 'position', {
                lat: pos.latitude,
                lng: pos.longitude,
                heading: pos.heading || 0
            });
            if(pos.speed !== undefined) this.handleTelemetry(pos.vehicle_id, 'speed', { speed_kmh: pos.speed });
            if(pos.battery_level !== undefined) this.handleTelemetry(pos.vehicle_id, 'battery', { level_pct: pos.battery_level });
            if(pos.status) this.handleStatus(pos.vehicle_id, pos.status);
        });
        
        if (history.length > 0) mapClient.fitAll();
    }

    // Busca a rota real pelas ruas entre dois pontos usando OSRM
    async getRouteGeometry(fromLat, fromLng, toLat, toLng) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            
            const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                // A geometria vem como array de [lng, lat] — convertemos para [lat, lng]
                const coords = data.routes[0].geometry.coordinates;
                return coords.map(c => ({ lat: c[1], lng: c[0] }));
            }
        } catch (error) {
            console.warn("OSRM Route falhou, usando linha reta:", error.message);
        }

        // Fallback: retorna só o ponto de destino (linha reta)
        return [{ lat: toLat, lng: toLng }];
    }

    async handleTelemetry(vehicleId, type, payload) {
        this.ensureVehicleExists(vehicleId);
        const vehicle = this.vehicles.get(vehicleId);

        if (type === 'position') {
            const newLat = payload.lat;
            const newLng = payload.lng;

            // Se já temos uma posição anterior, calcula a rota real pelas ruas
            if (vehicle.lat !== null && vehicle.lng !== null) {
                const routePoints = await this.getRouteGeometry(
                    vehicle.lat, vehicle.lng,
                    newLat, newLng
                );

                // Adiciona todos os pontos intermediários da rota ao mapa
                mapClient.addRoutePoints(vehicleId, routePoints);

                // Posição final é o último ponto da rota (snapped à rua)
                const finalPoint = routePoints[routePoints.length - 1];
                vehicle.lat = finalPoint.lat;
                vehicle.lng = finalPoint.lng;
            } else {
                // Primeiro ponto: usa nearest para snappar à rua mais próxima
                try {
                    const response = await fetch(
                        `https://router.project-osrm.org/nearest/v1/driving/${newLng},${newLat}?number=1`
                    );
                    const data = await response.json();
                    if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
                        vehicle.lat = data.waypoints[0].location[1];
                        vehicle.lng = data.waypoints[0].location[0];
                    } else {
                        vehicle.lat = newLat;
                        vehicle.lng = newLng;
                    }
                } catch (e) {
                    vehicle.lat = newLat;
                    vehicle.lng = newLng;
                }
            }

            vehicle.heading = payload.heading;
            
            // Move o marcador para a posição final (na rua)
            mapClient.updateVehicle(vehicleId, vehicle.lat, vehicle.lng, vehicle.speed, payload.heading, vehicle.status);
            
            // Salva no banco de dados
            db.savePosition(vehicleId, vehicle.lat, vehicle.lng, vehicle.speed, payload.heading);
            
        } else if (type === 'speed') {
            vehicle.speed = payload.speed_kmh;
            if (this.selectedVehicle === vehicleId) {
                chartsClient.updateSpeed(vehicle.speed);
            }
            
        } else if (type === 'battery') {
            vehicle.battery = payload.level_pct;
            if (this.selectedVehicle === vehicleId) {
                chartsClient.updateBattery(vehicle.battery);
            }
        }
    }

    handleStatus(vehicleId, payload) {
        this.ensureVehicleExists(vehicleId);
        const vehicle = this.vehicles.get(vehicleId);
        
        let status = typeof payload === 'string' ? payload : payload.status;
        status = status.replace(/"/g, ''); 
        
        vehicle.status = status;
        this.renderVehicleList();
        
        if (vehicle.lat && vehicle.lng) {
            mapClient.updateVehicle(vehicleId, vehicle.lat, vehicle.lng, vehicle.speed, vehicle.heading, status);
        }
    }

    handleAlert(vehicleId, payload) {
        this.ensureVehicleExists(vehicleId);
        
        const alertsList = document.getElementById('alerts-list');
        const entry = document.createElement('div');
        entry.style.padding = '0.5rem';
        entry.style.background = 'rgba(239, 68, 68, 0.1)';
        entry.style.borderLeft = '3px solid var(--color-danger)';
        entry.style.marginBottom = '0.5rem';
        entry.style.borderRadius = '4px';
        entry.style.fontSize = '0.85rem';
        
        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<strong>[${time}] ${vehicleId}</strong><br>${payload.message || payload.type}`;
        
        alertsList.prepend(entry);
        
        db.saveAlert(vehicleId, payload);
    }

    handleCommandResponse(vehicleId, payload) {
        commandClient.handleResponse(vehicleId, payload);
    }

    ensureVehicleExists(vehicleId) {
        if (!this.vehicles.has(vehicleId)) {
            this.vehicles.set(vehicleId, {
                id: vehicleId,
                lat: null,
                lng: null,
                speed: 0,
                heading: 0,
                battery: 100,
                status: 'offline'
            });
            this.renderVehicleList();
        }
    }

    renderVehicleList() {
        const list = document.getElementById('vehicle-list');
        list.innerHTML = '';
        
        this.vehicles.forEach(v => {
            const li = document.createElement('li');
            li.className = `vehicle-item ${this.selectedVehicle === v.id ? 'active' : ''}`;
            li.onclick = () => this.selectVehicle(v.id);
            
            li.innerHTML = `
                <span class="vehicle-name">${v.id}</span>
                <span class="vehicle-status-badge badge-${v.status}">${v.status.toUpperCase()}</span>
            `;
            list.appendChild(li);
        });
    }

    selectVehicle(vehicleId) {
        this.selectedVehicle = vehicleId;
        this.renderVehicleList();
        
        const vehicle = this.vehicles.get(vehicleId);
        
        commandClient.selectVehicle(vehicleId);
        mapClient.focusVehicle(vehicleId);
        
        chartsClient.reset();
        chartsClient.updateBattery(vehicle.battery);
    }
}

// Inicia aplicação
window.onload = () => {
    window.app = new DashboardApp();
};
