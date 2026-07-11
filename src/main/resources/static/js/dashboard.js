document.addEventListener("DOMContentLoaded", function () {
    const fadeInOverlay = document.getElementById("fade-in-overlay");
    const entranceVideo = document.getElementById("entrance-video");
    const entranceSpacer = document.getElementById("entrance-spacer");

    if (fadeInOverlay) {
        const navigationEntries = performance.getEntriesByType("navigation");
        const isBackNavigation = navigationEntries.length > 0 && navigationEntries[0].type === "back_forward";
        const yaSeLogeo = sessionStorage.getItem("jama_sesion_activa");

        if (isBackNavigation || yaSeLogeo === "true") {
            fadeInOverlay.remove();
            cargarMetricasYGraficosRealtime();
            return;
        }

        sessionStorage.setItem("jama_sesion_activa", "true");

        if (entranceVideo) {
            entranceVideo.muted = true;
            entranceVideo.defaultMuted = true;
            entranceVideo.setAttribute("playsinline", "true");
            entranceVideo.play().catch(() => {});

            entranceVideo.addEventListener("playing", function () {
                if (entranceSpacer) {
                    entranceSpacer.style.opacity = "0";
                    entranceSpacer.style.transform = "scale(0.95)";
                }
                entranceVideo.classList.remove("waiting");

                setTimeout(() => {
                    fadeInOverlay.classList.remove("active");
                    setTimeout(() => {
                        try {
                            entranceVideo.pause();
                            entranceVideo.src = "";
                            entranceVideo.load();
                        } catch(e) {}
                        fadeInOverlay.remove();
                        cargarMetricasYGraficosRealtime();
                    }, 600);
                }, 1000);
            }, { once: true });
        }
    } else {
        cargarMetricasYGraficosRealtime();
    }
});

if (typeof chartMesasInstance === 'undefined') {
    var chartMesasInstance = null;
}
if (typeof chartInsumosInstance === 'undefined') {
    var chartInsumosInstance = null;
}
if (typeof chartCanalesInstance === 'undefined') {
    var chartCanalesInstance = null;
}

async function cargarMetricasYGraficosRealtime() {
    try {
        const res = await fetch('/api/admin/metricas/dashboard'); // Asegúrate que este endpoint devuelva "totalVentasHoy"
        if (!res.ok) throw new Error("Error de comunicación API");
        const data = await res.json();

        // 🟢 ACTUALIZA LOS PLATOS VENDIDOS
        if (document.getElementById('kpiPlatosVendidosHoy')) {
            document.getElementById('kpiPlatosVendidosHoy').innerText = data.totalPedidosHoy || 0;
        }

        // 🟢 ¡NUEVA LÍNEA ASIGNADA!: SINCRONIZACIÓN ULTRA-AESTHETIC DE VENTAS DEL TURNO ACTIVO
        if (document.getElementById('kpiIngresosHoy')) {
            const ingresos = parseFloat(data.totalVentasHoy || 0).toFixed(2);
            document.getElementById('kpiIngresosHoy').innerText = ingresos;
        }

        const ctxMesas = document.getElementById('chartMesasSalon');
        if (ctxMesas) {
            const libres    = parseInt(data.estadoMesas.DISPONIBLE) || 0;
            const ocupadas  = parseInt(data.estadoMesas.OCUPADA) || 0;
            const reserva   = parseInt(data.estadoMesas.RESERVADA) || 0;
            const unificada = parseInt(data.estadoMesas.UNIFICADA) || 0;

            // ─── 🚀 INYECCIÓN EN ELEMENTOS DE TEXTO LATERALES (LEYENDA) ───
            const elLibres = document.getElementById('valMesasLibres');
            if (elLibres) elLibres.innerText = libres;

            const elOcupadas = document.getElementById('valMesasOcupadas');
            if (elOcupadas) elOcupadas.innerText = ocupadas;

            // Si tienes etiquetas en tu HTML para reservas y grupos, también las actualizamos:
            const elReservas = document.getElementById('valMesasReservadas');
            if (elReservas) elReservas.innerText = reserva;

            const elUnificadas = document.getElementById('valMesasUnificadas');
            if (elUnificadas) elUnificadas.innerText = unificada;


            if (chartMesasInstance) chartMesasInstance.destroy();

            chartMesasInstance = new Chart(ctxMesas, {
                type: 'doughnut',
                data: {
                    labels: ['Libres', 'Ocupadas', 'Reservadas', 'Grupos'],
                    datasets: [{
                        data: [libres, ocupadas, reserva, unificada],
                        backgroundColor: ['#10b981', '#ef4444', '#6b7280', '#4c1d95'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    cutout: '72%'
                }
            });
        }

const ctxInsumos = document.getElementById('chartTopInsumos');
        if (ctxInsumos) {
            const platosLabels = Object.keys(data.topPlatos || {});
            const platosValores = Object.values(data.topPlatos || {});

            if (chartInsumosInstance) chartInsumosInstance.destroy();

            chartInsumosInstance = new Chart(ctxInsumos, {
                type: 'bar',
                data: {
                    labels: platosLabels.length > 0 ? platosLabels : ['Sin platos vendidos'],
                    datasets: [{
                        data: platosValores.length > 0 ? platosValores : [0],
                        backgroundColor: '#1B3A2C',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#1B3A2C', stepSize: 1 } },
                        y: { grid: { display: false }, ticks: { font: { weight: 'bold' }, color: '#1B3A2C' } }
                    }
                }
            });
        }

        const ctxCanales = document.getElementById('chartCanalesVenta');
        if (ctxCanales) {
            const salonVentas    = parseInt(data.canalesVenta.SALON) || 0;
            const deliveryVentas = parseInt(data.canalesVenta.DELIVERY) || 0;
            const qrVentas       = parseInt(data.canalesVenta.CARTA_QR) || 0;

            if (chartCanalesInstance) chartCanalesInstance.destroy();

            chartCanalesInstance = new Chart(ctxCanales, {
                type: 'polarArea',
                data: {
                    labels: ['Salón', 'Delivery', 'Carta Web QR'],
                    datasets: [{
                        data: [salonVentas, deliveryVentas, qrVentas],
                        backgroundColor: [
                            'rgba(27, 58, 44, 0.85)',
                            'rgba(78, 115, 223, 0.85)',
                            'rgba(255, 179, 138, 0.85)'
                        ],
                        borderColor: '#ffffff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 10, font: { size: 11 } }
                        }
                    },
                    scales: {
                        r: { ticks: { display: false }, grid: { color: 'rgba(27, 58, 44, 0.05)' } }
                    }
                }
            });
        }

    } catch (error) {
        console.error("💥 Error en sincronización de métricas del Dashboard:", error);
    }
}

if (typeof bucleMetricasDashboard === 'undefined') {
    var bucleMetricasDashboard = setInterval(function () {
        cargarMetricasYGraficosRealtime();
    }, 60000);
}