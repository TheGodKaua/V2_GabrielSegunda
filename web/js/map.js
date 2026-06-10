// map.js - Gerencia o mapa Leaflet.js

class MapManager {
    constructor() {
        this.map = L.map('map').setView(CONFIG.map.center, CONFIG.map.zoom);
        this.markers = {};
        this.routes = {};
        
        // Camada do OpenStreetMap escuro (usando filtro css no style.css)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        this.onMarkerClick = null;
    }

    createIcon(vehicleId, heading = 0, status = 'moving') {
        let emoji = vehicleId.startsWith('moto') ? '🏍️' : '🚛';
        let colorClass = `badge-${status}`;
        
        return L.divIcon({
            className: 'vehicle-marker',
            html: `
                <div class="vehicle-icon-inner" style="transform: rotate(${heading}deg);">
                    ${emoji}
                </div>
                <div style="position: absolute; bottom: -20px; font-size: 10px; background: rgba(0,0,0,0.7); padding: 2px 4px; border-radius: 4px; color: white; white-space: nowrap;">
                    ${vehicleId}
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    }

    updateVehicle(vehicleId, lat, lng, speed, heading, status = 'moving') {
        const latLng = [lat, lng];

        // Atualizar Marcador
        if (this.markers[vehicleId]) {
            this.markers[vehicleId].setLatLng(latLng);
            this.markers[vehicleId].setIcon(this.createIcon(vehicleId, heading, status));
        } else {
            const marker = L.marker(latLng, { 
                icon: this.createIcon(vehicleId, heading, status) 
            }).addTo(this.map);
            
            marker.bindPopup(`<b>${vehicleId}</b><br>Speed: <span id="popup-speed-${vehicleId}">0</span> km/h`);
            
            marker.on('click', () => {
                if(this.onMarkerClick) this.onMarkerClick(vehicleId);
            });
            
            this.markers[vehicleId] = marker;
        }

        // Atualizar Popup se aberto
        const popupSpeed = document.getElementById(`popup-speed-${vehicleId}`);
        if(popupSpeed) popupSpeed.textContent = Math.round(speed);

        // Atualizar Rota (Polyline)
        if (!this.routes[vehicleId]) {
            this.routes[vehicleId] = L.polyline([], {
                color: vehicleId.startsWith('moto') ? '#f59e0b' : '#3b82f6',
                weight: 3,
                opacity: 0.7,
                dashArray: '5, 10'
            }).addTo(this.map);
        }
        
        this.routes[vehicleId].addLatLng(latLng);
        
        // Manter apenas os últimos 50 pontos da rota para não poluir
        const coords = this.routes[vehicleId].getLatLngs();
        if (coords.length > 50) {
            coords.shift();
            this.routes[vehicleId].setLatLngs(coords);
        }
    }

    focusVehicle(vehicleId) {
        if (this.markers[vehicleId]) {
            this.map.setView(this.markers[vehicleId].getLatLng(), 16);
            this.markers[vehicleId].openPopup();
        }
    }

    fitAll() {
        const group = new L.featureGroup(Object.values(this.markers));
        if (group.getLayers().length > 0) {
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }

    triggerHonk(vehicleId) {
        const marker = this.markers[vehicleId];
        if (!marker) return;

        const center = marker.getLatLng();
        const waves = [];
        const maxRadius = 300; // metros
        const duration = 1200; // ms
        const numWaves = 3;

        // Cria ondas com delay escalonado
        for (let i = 0; i < numWaves; i++) {
            setTimeout(() => {
                const circle = L.circle(center, {
                    radius: 10,
                    color: '#f59e0b',
                    fillColor: '#f59e0b',
                    fillOpacity: 0.4,
                    weight: 2
                }).addTo(this.map);

                const startTime = performance.now();

                const animate = (currentTime) => {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    const currentRadius = 10 + (maxRadius - 10) * progress;
                    const currentOpacity = 0.4 * (1 - progress);
                    
                    circle.setRadius(currentRadius);
                    circle.setStyle({ 
                        fillOpacity: currentOpacity, 
                        opacity: currentOpacity * 2 
                    });

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        this.map.removeLayer(circle);
                    }
                };

                requestAnimationFrame(animate);
            }, i * 250); // delay de 250ms entre cada onda
        }
    }
}

const mapClient = new MapManager();
