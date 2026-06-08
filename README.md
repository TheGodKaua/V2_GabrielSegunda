# FleetTracker 🚛🏍️

> Projeto V2 - Disciplina N461: Sistemas Multimídia e Distribuídos

Um **Sistema de Monitoramento de Frota Distribuído** que rastreia veículos em tempo real utilizando comunicação **MQTT over WebSockets** e telemetria gerada por dispositivos embarcados (ESP32) simulados.

## 👥 Equipe
- Kauã Cassiano Silva
- Gabriel Alcântara Ribeiro
- João Luiz Alves Mamede Netto
- Diogo Coutinho de Freitas
- Igor dos Reis Alves

## 🌐 Links
- **Interface Web (Dashboard)**: [Acessar a Aplicação na Vercel] *(Substitua pelo seu link gerado após o deploy)*
- **Simulador 1 (Caminhão 01)**: [Link Wokwi] *(Substitua pelo link do seu projeto salvo)*
- **Simulador 2 (Caminhão 02)**: [Link Wokwi] *(Substitua pelo link do seu projeto salvo)*
- **Simulador 3 (Moto 01)**: [Link Wokwi] *(Substitua pelo link do seu projeto salvo)*

## 🏗️ Arquitetura

O projeto utiliza um broker MQTT em nuvem (HiveMQ Cloud) que atua como hub central. Na ponta dos clientes, temos os dispositivos ESP32 publicando telemetria (QoS 0) e alertas (QoS 1) utilizando TLS seguro na porta 8883. Na ponta do usuário, um Dashboard Web desenvolvido com HTML/JS puro se conecta via WebSockets Secure (WSS na porta 8884) para assinar os tópicos e renderizar o mapa com Leaflet.js e gráficos em tempo real com Chart.js. Opcionalmente, um backend do Supabase arquiva o histórico para replay de rotas.

## 📡 Tópicos MQTT e QoS

Para demonstrar os recursos avançados, foi desenhada uma estrutura hierárquica baseada em: `fleet/{fleet_id}/{vehicle_id}/{category}/{metric}`

| Tópico | QoS | Retained | Justificativa |
|---|---|---|---|
| `fleet/logistics-01/+/telemetry/position` | 0 | ❌ | Posições enviadas a cada 3s. Um ponto perdido não afeta a usabilidade geral. |
| `fleet/logistics-01/+/telemetry/speed` | 0 | ❌ | Velocidade associada à posição. Atualização rápida e de pouco overhead. |
| `fleet/logistics-01/+/telemetry/battery` | 1 | ❌ | Enviado a cada 30s. Dado vital para a integridade do veículo, deve ser entregue. |
| `fleet/logistics-01/+/status` | 1 | ✅ | Utiliza Retained e LWT. Fundamental para recém-conectados saberem imediatamente o status dos veículos. |
| `fleet/logistics-01/+/alerts` | 1 | ❌ | Alertas de SOS ou bateria baixa precisam garantir recebimento na central. |
| `fleet/logistics-01/+/commands/stop` | 2 | ❌ | Comando crítico para intervenção veicular. Exactly-once garante que a central saiba que foi entregue. |
| `fleet/logistics-01/+/commands/honk` | 2 | ❌ | Mesmo princípio de comando de intervenção direta com confirmação de entrega. |

*(O dashboard utiliza o wildcard `+` no lugar de `vehicle_id` para assinar todos os veículos de uma vez)*

## 🚀 Como testar localmente

1. **Dashboard**
   - Você pode simplesmente abrir o `web/index.html` no seu navegador (com as credenciais corretas configuradas no `js/config.js`), ou usar um Live Server.

2. **Simuladores Wokwi**
   - Acesse o [Wokwi](https://wokwi.com/), crie um novo projeto ESP32 e copie o conteúdo de `esp32/vehicle-01/sketch.ino`, `diagram.json` e `libraries.txt`.
   - Ajuste os potenciômetros para ver os veículos se movendo no mapa.

3. **Verificação Mosquitto CLI**
   Para verificar o tráfego via terminal:
   ```bash
   mosquitto_sub -h 02056c0680db404c8459ccfb6b33a21c.s1.eu.hivemq.cloud -p 8883 -u "dashboard-web" -P "Asd12345" --capath /etc/ssl/certs -t "fleet/#" -v
   ```

## 📚 Tecnologias Empregadas
- **ESP32 & C++**: Programação dos sensores simulados e Wi-Fi embarcado.
- **Wokwi**: Simulação de hardware.
- **HiveMQ Cloud**: Broker MQTT Serverless com TLS e WebSockets.
- **MQTT.js**: Client broker para Web.
- **Leaflet.js & OpenStreetMap**: Renderização interativa de mapas.
- **Chart.js**: Renderização dos manômetros e gráficos de histórico.
- **Supabase (PostgreSQL)**: Persistência de dados das rotas (Bonificação).
- **Vercel**: Hospedagem PaaS da aplicação web estática.
