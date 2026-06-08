// commands.js - Lida com envio de comandos para os veículos
class CommandManager {
    constructor() {
        this.btnStop = document.getElementById('btn-stop');
        this.btnHonk = document.getElementById('btn-honk');
        this.feedbackEl = document.getElementById('command-feedback');
        this.selectedVehicle = null;

        this.setupListeners();
    }

    setupListeners() {
        this.btnStop.addEventListener('click', () => {
            this.sendCommand('stop');
        });

        this.btnHonk.addEventListener('click', () => {
            this.sendCommand('honk', { duration_ms: 1000 });
        });
    }

    selectVehicle(vehicleId) {
        this.selectedVehicle = vehicleId;
        const display = document.getElementById('selected-vehicle-display');
        display.textContent = `Veículo selecionado: ${vehicleId}`;
        
        this.btnStop.disabled = false;
        this.btnHonk.disabled = false;
        this.showFeedback('', '');
    }

    sendCommand(command, params = {}) {
        if (!this.selectedVehicle) return;

        this.btnStop.disabled = true;
        this.btnHonk.disabled = true;
        this.showFeedback(`Enviando comando ${command.toUpperCase()}...`, 'text-warning');

        // Envia QoS 2 garantido
        const success = mqttClient.publishCommand(this.selectedVehicle, command, params);
        
        if (!success) {
            this.showFeedback('Erro: Dashboard offline', 'text-danger');
            this.resetButtons();
        }
        
        // Timeout caso o veículo não responda
        setTimeout(() => {
            if (this.btnStop.disabled) {
                this.showFeedback('Timeout: Sem resposta do veículo', 'text-danger');
                this.resetButtons();
            }
        }, 5000);
    }

    handleResponse(vehicleId, payload) {
        if (vehicleId === this.selectedVehicle) {
            this.showFeedback('Comando recebido pelo veículo!', 'text-success');
            this.resetButtons();
        }
    }

    resetButtons() {
        if (this.selectedVehicle) {
            this.btnStop.disabled = false;
            this.btnHonk.disabled = false;
        }
    }

    showFeedback(msg, className) {
        this.feedbackEl.textContent = msg;
        this.feedbackEl.className = `command-feedback ${className}`;
    }
}

const commandClient = new CommandManager();
