$(document).ready(function () {
    // Refresca los KPIs del dashboard cada 60 segundos sin recargar toda la página
    setInterval(function () {
        $.get('/dashboard/kpis', function (data) {
            if (data.totalVentasHoy !== undefined) {
                $('#kpiIngresosHoy').text('S/ ' + parseFloat(data.totalVentasHoy).toFixed(2));
            }
            if (data.platosVendidosHoy !== undefined) {
                $('#kpiPlatosVendidosHoy').text(data.platosVendidosHoy);
            }
        }).fail(function () {
            // Si el endpoint no existe aún, no hace nada (silencioso)
        });
    }, 60000);
});