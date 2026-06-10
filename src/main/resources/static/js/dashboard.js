/**
 * LA JAMA - MÓDULO PRINCIPAL DEL DASHBOARD
 * Responsabilidad: Controlar los intervalos de actualización de KPIs comerciales
 * y gestionar el telón de carga premium (Relevo GPU) en el primer acceso.
 */

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
                    }, 600);
                }, 1000);

            }, { once: true });
        }
    }
});

// ========================================================
// CONTROL DE AUTOMATIZACIONES RECURRENTES (JQUERY)
// ========================================================
$(document).ready(function () {
    if (document.getElementById('kpiIngresosHoy') || document.getElementById('kpiPlatosVendidosHoy')) {
        setInterval(function () {
            $.get('/dashboard/kpis', function (data) {
                if (data.totalVentasHoy !== undefined) {
                    $('#kpiIngresosHoy').text('S/ ' + parseFloat(data.totalVentasHoy).toFixed(2));
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