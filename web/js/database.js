// database.js - Integração com Supabase

class DBManager {
    constructor() {
        this.supabase = null;
        if (CONFIG.supabase.url && CONFIG.supabase.anonKey) {
            this.supabase = window.supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
        } else {
            console.warn("Supabase não configurado. Histórico desabilitado.");
        }
        
        // Controle para não inserir cada ponto de posição no DB (economia de quota)
        // Só salva 1 a cada 5 leituras por veículo (aprox a cada 15s)
        this.insertCounters = {};
    }

    async savePosition(vehicleId, lat, lng, speed, heading) {
        if (!this.supabase) return;

        if (!this.insertCounters[vehicleId]) this.insertCounters[vehicleId] = 0;
        this.insertCounters[vehicleId]++;

        if (this.insertCounters[vehicleId] >= 5) {
            this.insertCounters[vehicleId] = 0;
            
            // Assumimos status "moving" se speed > 0, "idle" ou "stopped" seria melhor gerido via state
            const status = speed > 5 ? 'moving' : 'idle';

            try {
                const { error } = await this.supabase
                    .from('vehicle_positions')
                    .insert({
                        vehicle_id: vehicleId,
                        latitude: lat,
                        longitude: lng,
                        speed: speed,
                        heading: heading,
                        status: status
                    });
                
                if (error) console.error("Erro ao salvar posição no Supabase", error);
            } catch (err) {
                console.error("Supabase exception:", err);
            }
        }
    }

    async saveAlert(vehicleId, alertData) {
        if (!this.supabase) return;

        try {
            const { error } = await this.supabase
                .from('vehicle_alerts')
                .insert({
                    vehicle_id: vehicleId,
                    alert_type: alertData.type || 'unknown',
                    severity: alertData.severity || 'info',
                    message: alertData.message || ''
                });
            if (error) console.error("Erro ao salvar alerta no Supabase", error);
        } catch(e) {}
    }

    // Carregar última posição conhecida de todos os veículos
    async loadInitialPositions() {
        if (!this.supabase) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('latest_vehicle_positions')
                .select('*');
            
            if (error && error.code === '42P01') {
                // View não existe, faz fallback para query manual com deduplicação no JS
                const { data: rawData, error: rawError } = await this.supabase
                    .from('vehicle_positions')
                    .select('vehicle_id, latitude, longitude, speed, status, recorded_at')
                    .order('recorded_at', { ascending: false })
                    .limit(50);
                
                if (rawError) return [];
                
                const latest = {};
                rawData.forEach(row => {
                    if (!latest[row.vehicle_id]) latest[row.vehicle_id] = row;
                });
                return Object.values(latest);
            }
            
            return data || [];
        } catch(e) {
            return [];
        }
    }
}

const db = new DBManager();
