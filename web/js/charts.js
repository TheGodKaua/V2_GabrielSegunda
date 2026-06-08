// charts.js - Gerencia os gráficos Chart.js

Chart.defaults.color = '#a0a0a0';
Chart.defaults.font.family = "'Inter', sans-serif";

class ChartsManager {
    constructor() {
        this.speedChart = null;
        this.batteryGauge = null;
        this.initCharts();
    }

    initCharts() {
        // Line Chart de Velocidade
        const speedCtx = document.getElementById('speedChart').getContext('2d');
        this.speedChart = new Chart(speedCtx, {
            type: 'line',
            data: {
                labels: Array(20).fill(''), // Janela de 20 pontos
                datasets: [{
                    label: 'Speed (km/h)',
                    data: Array(20).fill(0),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 0 }, // Desligar para atualizações rápidas
                scales: {
                    x: { display: false },
                    y: { 
                        display: true, 
                        min: 0, 
                        max: 120,
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

        // Doughnut Gauge de Bateria com texto central
        const centerTextPlugin = {
            id: 'centerText',
            beforeDraw(chart) {
                const { ctx, width, height } = chart;
                const value = chart.data.datasets[0].data[0];
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = 'bold 24px Inter';
                ctx.fillStyle = '#fff';
                ctx.fillText(`${Math.round(value)}%`, width / 2, height - 30);
                ctx.restore();
            }
        };

        const batteryCtx = document.getElementById('batteryGauge').getContext('2d');
        this.batteryGauge = new Chart(batteryCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [100, 0],
                    backgroundColor: ['#10b981', 'rgba(255,255,255,0.1)'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: -90
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [centerTextPlugin]
        });
    }

    updateSpeed(speed) {
        const data = this.speedChart.data.datasets[0].data;
        data.push(speed);
        data.shift();
        this.speedChart.update('none');
    }

    updateBattery(percentage) {
        this.batteryGauge.data.datasets[0].data = [percentage, 100 - percentage];
        
        let color = '#10b981'; // success
        if (percentage < 20) color = '#ef4444'; // danger
        else if (percentage < 50) color = '#f59e0b'; // warning
        
        this.batteryGauge.data.datasets[0].backgroundColor[0] = color;
        this.batteryGauge.update();
    }
    
    reset() {
        this.speedChart.data.datasets[0].data = Array(20).fill(0);
        this.speedChart.update('none');
        this.updateBattery(100);
    }
}

const chartsClient = new ChartsManager();
