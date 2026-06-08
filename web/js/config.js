// Configurações Globais do Projeto
const CONFIG = {
    // Configurações do MQTT (HiveMQ Cloud)
    mqtt: {
        // Substitua pelo host do seu cluster HiveMQ Cloud
        host: 'wss://SEU_CLUSTER.s1.eu.hivemq.cloud:8884/mqtt',
        // Credenciais criadas no Access Management do HiveMQ
        username: 'dashboard-web',
        password: 'SuaSenhaAqui',
        // ID da frota (usado na raiz dos tópicos)
        fleetId: 'logistics-01'
    },
    
    // Configurações do Banco de Dados (Supabase)
    // Opcional para bonificação
    supabase: {
        // Substitua pela URL do seu projeto
        url: 'https://SEU_PROJETO.supabase.co',
        // Substitua pela anon key (public)
        anonKey: 'SUA_ANON_KEY'
    },
    
    // Configurações do Mapa
    map: {
        // Coordenadas iniciais do centro do mapa (São Paulo)
        center: [-23.5505, -46.6333],
        // Zoom inicial
        zoom: 13
    }
};
