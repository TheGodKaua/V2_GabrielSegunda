// Configurações Globais do Projeto
const CONFIG = {
    // Configurações do MQTT (HiveMQ Cloud)
    mqtt: {
        host: 'wss://02056c0680db404c8459ccfb6b33a21c.s1.eu.hivemq.cloud:8884/mqtt',
        username: 'dashboard-web',
        password: 'Asd12345',
        fleetId: 'logistics-01'
    },
    
    // Configurações do Banco de Dados (Supabase)
    supabase: {
        url: 'https://lcyzckunfxvxkdhuhavf.supabase.co',
        anonKey: 'sb_publishable_1jIJnuhdTXkSUhV5ho2JqA_RZExfM5X'
    },
    
    // Configurações do Mapa
    map: {
        center: [-23.5505, -46.6333],
        zoom: 13
    }
};
