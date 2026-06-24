/**
 * LA JAMA - MÓDULO PRINCIPAL DEL DASHBOARD (MÉTRICAS PREMIUM VIVAS)
 */

document.addEventListener("DOMContentLoaded", function () {
    const fadeInOverlay = document.getElementById("fade-in-overlay");
    const entranceVideo = document.getElementById("entrance-video");
    const entranceSpacer = document.getElementById("entrance-spacer");

    // ── 🎬 1. CONTROL LOGEO / TELÓN DE ENTRADA ──
    if (fadeInOverlay) {
        const navigationEntries = performance.getEntriesByType("navigation");
        const isBackNavigation = navigationEntries.length > 0 && navigationEntries[0].type === "back_forward";
        const yaSeLogeo = sessionStorage.getItem("jama_sesion_activa");

        if (isBackNavigation || yaSeLogeo === "true") {
            fadeInOverlay.remove();
            inicializarGraficosLaJama(); // Levantamos gráficos directo si no hay telón
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
                        inicializarGraficosLaJama(); // Levantamos gráficos al abrir el telón
                    }, 600);
                }, 1000);
            }, { once: true });
        }
    } else {
        inicializarGraficosLaJama();
    }
});

// ── 📊 2. MOTOR CORE DE COMPILACIÓN GRÁFICOS (CHART.JS) ──
function inicializarGraficosLaJama() {

    // Gráfico A: Ocupación del Salón (Doughnut)
    const ctxMesas = document.getElementById('chartMesasSalon');
    if (ctxMesas) {
        const libres = parseInt(document.getElementById('valMesasLibres')?.textContent) || 0;
        const ocupadas = parseInt(document.getElementById('valMesasOcupadas')?.textContent) || 0;

        new Chart(ctxMesas, {
            type: 'doughnut',
            data: {
                labels: ['Libres', 'Ocupadas'],
                datasets: [{
                    data: [libres, ocupadas],
                    backgroundColor: ['#10b981', '#ef4444'],
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

    // Gráfico B: Insumos Más Demandados (Barras Horizontales)
    const ctxInsumos = document.getElementById('chartTopInsumos');
    if (ctxInsumos) {
        new Chart(ctxInsumos, {
            type: 'bar',
            data: {
                labels: ['Lomo Fino', 'Papa Amarilla', 'Arroz Extra', 'Cebolla Roja', 'Ají Amarillo'],
                datasets: [{
                    data: [18.5, 34.2, 22.0, 14.8, 28.5],
                    backgroundColor: '#1B3A2C', // Verde oficial La Jama
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#1B3A2C' } },
                    y: { grid: { display: false }, ticks: { font: { weight: 'bold' }, color: '#1B3A2C' } }
                }
            }
        });
    }

    // Gráfico C: Canales de Venta (Polar Area Logístico)
    const ctxCanales = document.getElementById('chartCanalesVenta');
    if (ctxCanales) {
        new Chart(ctxCanales, {
            type: 'polarArea',
            data: {
                labels: ['Salón', 'Delivery', 'Carta Web QR'],
                datasets: [{
                    data: [60, 25, 15],
                    backgroundColor: [
                        'rgba(27, 58, 44, 0.85)',  // Verde Jama
                        'rgba(78, 115, 223, 0.85)', // Azul Logístico
                        'rgba(255, 179, 138, 0.85)' // Skin / Peach
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
}

// ── 🔄 3. SINOPSIS SÍNCRONA DE ACCESOS/KPIS (JQUERY) ──
$(document).ready(function () {
    if (document.getElementById('kpiIngresosHoy') || document.getElementById('kpiPlatosVendidosHoy')) {
        setInterval(function () {
            $.get('/dashboard/kpis', function (data) {
                if (data.totalVentasHoy !== undefined) {
                    $('#kpiIngresosHoy').text(parseFloat(data.totalVentasHoy).toFixed(2));
                }
                if (data.platosVendidosHoy !== undefined) {
                    $('#kpiPlatosVendidosHoy').text(data.platosVendidosHoy);
                }
            }).fail(function () {
                // Fail-safe silencioso
            });
        }, 60000);
    }
});