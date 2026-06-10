// dashboard.js - Orquestração principal

class DashboardApp {
    constructor() {
        this.vehicles = new Map();
        this.selectedVehicle = null;
        
        this.init();
    }

    async init() {
        console.log("Iniciando FleetTracker Dashboard...");
        
        // Registrar callbacks do MQTT
        mqttClient.onTelemetry = this.handleTelemetry.bind(this);
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

    async handleTelemetry(vehicleId, type, payload) {
        this.ensureVehicleExists(vehicleId);
        const vehicle = this.vehicles.get(vehicleId);

        if (type === 'position') {
            let finalLat = payload.lat;
            let finalLng = payload.lng;
            
            try {
                // Snap to Road via OSRM (Open Source Routing Machine)
                const response = await fetch(`https://router.project-osrm.org/nearest/v1/driving/${finalLng},${finalLat}?number=1`);
                const data = await response.json();
                if (data.code === 'Ok' && data.waypoints && data.waypoints.length > 0) {
                    finalLng = data.waypoints[0].location[0];
                    finalLat = data.waypoints[0].location[1];
                }
            } catch (error) {
                console.error("OSRM Snap to Road falhou:", error);
            }

            vehicle.lat = finalLat;
            vehicle.lng = finalLng;
            vehicle.heading = payload.heading;
            
            mapClient.updateVehicle(vehicleId, finalLat, finalLng, vehicle.speed, payload.heading, vehicle.status);
            
            // Salva no banco de dados (o db.js já tem debounce interno)
            db.savePosition(vehicleId, finalLat, finalLng, vehicle.speed, payload.heading);
            
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
        
        // Payload pode vir como string simples "offline" ou json {"status":"offline"}
        let status = typeof payload === 'string' ? payload : payload.status;
        // remove aspas se vier do mosquitto
        status = status.replace(/"/g, ''); 
        
        vehicle.status = status;
        this.renderVehicleList();
        
        // Atualiza cor do marcador no mapa
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
        
        // Salva no DB
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
        
        // Atualiza painel de comandos
        commandClient.selectVehicle(vehicleId);
        
        // Centraliza mapa
        mapClient.focusVehicle(vehicleId);
        
        // Atualiza gráficos (zera o de velocidade temporariamente ou mostra o atual)
        chartsClient.reset();
        chartsClient.updateBattery(vehicle.battery);
    }
}

// Inicia aplicação
window.onload = () => {
    window.app = new DashboardApp();
};
