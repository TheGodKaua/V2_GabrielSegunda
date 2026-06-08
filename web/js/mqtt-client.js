// mqtt-client.js - Gerencia a conexão com o HiveMQ Cloud

class MQTTManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        // Callbacks que outras partes do dashboard podem registrar
        this.onTelemetry = null;
        this.onStatus = null;
        this.onAlert = null;
        this.onCommandResponse = null;
        this.onConnectionChange = null;
    }

    connect() {
        const { host, username, password, fleetId } = CONFIG.mqtt;
        
        // Opções de conexão
        const options = {
            clientId: `dashboard_${Math.random().toString(16).substring(2, 10)}`,
            username: username,
            password: password,
            protocol: 'wss',
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 5000,
            
            // LWT: Last Will and Testament para o dashboard
            will: {
                topic: `fleet/${fleetId}/dashboard/status`,
                payload: JSON.stringify({ status: 'offline', timestamp: Date.now() }),
                qos: 1,
                retain: true
            }
        };

        this.updateStatusUI('connecting');
        if(this.onConnectionChange) this.onConnectionChange('connecting');

        this.client = mqtt.connect(host, options);

        this.client.on('connect', () => {
            console.log('🔗 Conectado ao HiveMQ Cloud');
            this.isConnected = true;
            this.updateStatusUI('connected');
            if(this.onConnectionChange) this.onConnectionChange('connected');

            // Publica status online do dashboard
            this.client.publish(
                `fleet/${fleetId}/dashboard/status`,
                JSON.stringify({ status: 'online', timestamp: Date.now() }),
                { qos: 1, retain: true }
            );

            // Subscrever aos tópicos usando wildcards (+)
            this.client.subscribe({
                [`fleet/${fleetId}/+/telemetry/position`]: { qos: 0 },
                [`fleet/${fleetId}/+/telemetry/speed`]: { qos: 0 },
                [`fleet/${fleetId}/+/telemetry/battery`]: { qos: 1 },
                [`fleet/${fleetId}/+/status`]: { qos: 1 },
                [`fleet/${fleetId}/+/alerts`]: { qos: 1 },
                [`fleet/${fleetId}/+/commands/response`]: { qos: 1 }
            });
        });

        this.client.on('message', (topic, message) => {
            try {
                const payload = JSON.parse(message.toString());
                const topicParts = topic.split('/');
                const vehicleId = topicParts[2];
                const dataType = topicParts.slice(3).join('/');

                // Log na UI
                this.logMessage(topic, payload);

                // Rotear mensagem para o callback apropriado
                if (dataType.startsWith('telemetry/')) {
                    if(this.onTelemetry) this.onTelemetry(vehicleId, dataType.split('/')[1], payload);
                } else if (dataType === 'status') {
                    if(this.onStatus) this.onStatus(vehicleId, payload);
                } else if (dataType === 'alerts') {
                    if(this.onAlert) this.onAlert(vehicleId, payload);
                } else if (dataType === 'commands/response') {
                    if(this.onCommandResponse) this.onCommandResponse(vehicleId, payload);
                }

            } catch (e) {
                console.error('Falha ao processar mensagem', topic, message.toString());
            }
        });

        this.client.on('error', (err) => {
            console.error('Erro MQTT:', err);
        });

        this.client.on('reconnect', () => {
            this.updateStatusUI('connecting');
            if(this.onConnectionChange) this.onConnectionChange('connecting');
        });

        this.client.on('offline', () => {
            this.isConnected = false;
            this.updateStatusUI('disconnected');
            if(this.onConnectionChange) this.onConnectionChange('disconnected');
        });
    }

    publishCommand(vehicleId, command, params = {}) {
        if (!this.isConnected) return false;

        const topic = `fleet/${CONFIG.mqtt.fleetId}/${vehicleId}/commands/${command}`;
        const payload = JSON.stringify({
            requestId: Date.now(),
            ...params
        });

        // Comandos críticos usam QoS 2
        this.client.publish(topic, payload, { qos: 2 });
        this.logMessage(`[PUB] ${topic}`, payload, true);
        return true;
    }

    updateStatusUI(status) {
        const indicator = document.querySelector('.status-indicator');
        const text = document.querySelector('.status-text');
        
        indicator.className = `status-indicator ${status}`;
        
        if (status === 'connected') text.textContent = 'Conectado';
        else if (status === 'connecting') text.textContent = 'Conectando...';
        else text.textContent = 'Desconectado';
    }

    logMessage(topic, data, isOutbound = false) {
        const logsContainer = document.getElementById('mqtt-logs');
        if (!logsContainer) return;

        const entry = document.createElement('div');
        entry.className = 'log-entry';
        
        const time = new Date().toLocaleTimeString();
        let displayData = typeof data === 'string' ? data : JSON.stringify(data);
        if (displayData.length > 50) displayData = displayData.substring(0, 50) + '...';

        entry.innerHTML = `<span style="color: #666">[${time}]</span> ${isOutbound ? '📤' : '📥'} <span class="log-topic">${topic}</span>: ${displayData}`;
        
        logsContainer.appendChild(entry);
        logsContainer.scrollTop = logsContainer.scrollHeight;

        // Manter apenas últimos 50 logs
        while (logsContainer.children.length > 50) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }
}

// Instância global
const mqttClient = new MQTTManager();
