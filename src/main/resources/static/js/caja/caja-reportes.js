// ============================================================================
// caja-reportes.js
// ============================================================================
function actualizarBotonesReporte() {
    const segmentoActivo = document.querySelector('input[name="cajaSegmento"]:checked');
    if (!segmentoActivo) return;

    const onclickStr = segmentoActivo.getAttribute('onclick') || '';
    let panelId = 'panel-liquidados';

    if (onclickStr.includes('panel-movimientos-turno')) panelId = 'panel-movimientos-turno';
    else if (onclickStr.includes('panel-historial-completo')) panelId = 'panel-historial-completo';
    else if (onclickStr.includes('panel-historial')) panelId = 'panel-historial';
    else if (onclickStr.includes('panel-por-cobrar')) {
        document.querySelectorAll('button[onclick^="exportarReporteCaja"]').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
        });
        return;
    }

    const panel = document.getElementById(panelId);
    let tieneDataMostrable = false;

    if (panel) {
        if (panelId === 'panel-historial') {
            const textoCuerpo = document.getElementById('cuerpoHistorialCajas')?.innerText || '';
            tieneDataMostrable = !textoCuerpo.includes('Haz clic') && !textoCuerpo.includes('No se encontraron') && textoCuerpo.trim() !== '';
        } else if (panelId === 'panel-historial-completo') {
            const textoCuerpo = document.getElementById('cuerpoHistorialComprobantesAsincrono')?.innerText || '';
            tieneDataMostrable = !textoCuerpo.includes('Nada por aquí') && !textoCuerpo.includes('No se encontraron') && !textoCuerpo.includes('Extrayendo') && panel.querySelectorAll('.fila-pedido-caja').length > 0;
        } else if (panelId === 'panel-liquidados') {
            // 🚀 MAGIA PURA: Cuenta solo las filas que el filtro en caliente NO ha ocultado
            tieneDataMostrable = panel.querySelectorAll('.fila-pedido-caja:not([data-excluido-filtro="true"])').length > 0;
        } else {
            // Bitácora de caja regular
            tieneDataMostrable = panel.querySelectorAll('.fila-pedido-caja').length > 0;
        }
    }

    document.querySelectorAll('button[onclick^="exportarReporteCaja"]').forEach(btn => {
        btn.disabled = !tieneDataMostrable;
        btn.style.opacity = tieneDataMostrable ? "1" : "0.5";
        btn.style.cursor = tieneDataMostrable ? "pointer" : "not-allowed";
    });
}
// Tu función original de exportación blindada con el validador interno
function exportarReporteCaja(formato) {
    const tipoFormato = formato.toUpperCase();
    const segmentoActivo = document.querySelector('input[name="cajaSegmento"]:checked');
    if (!segmentoActivo) return;

    if (document.querySelector(`button[onclick="exportarReporteCaja('${formato}')"]`)?.disabled) {
        return;
    }

    const onclickStr = segmentoActivo.getAttribute('onclick') || '';
    let panelId = 'panel-liquidados';

    if (onclickStr.includes('panel-movimientos-turno')) panelId = 'panel-movimientos-turno';
    else if (onclickStr.includes('panel-historial-completo')) panelId = 'panel-historial-completo';
    else if (onclickStr.includes('panel-historial')) panelId = 'panel-historial';
    else if (onclickStr.includes('panel-por-cobrar')) return;

    let urlBase = `/admin/reportes/caja/${panelId.replace('panel-', '')}/${tipoFormato.toLowerCase()}`;
    const params = new URLSearchParams();

    if (panelId === 'panel-liquidados') {
        params.set('texto', document.getElementById('filtroAsincronoTexto')?.value || '');
        params.set('metodo', document.getElementById('filtroAsincronoMetodo')?.value || 'TODOS');
        params.set('origen', document.getElementById('filtroAsincronoOrigen')?.value || 'TODOS');
    }
    else if (panelId === 'panel-historial') {
        params.set('inicio', document.getElementById('historialFechaInicio')?.value || '');
        params.set('fin', document.getElementById('historialFechaFin')?.value || '');
        // 🎯 Enlazamos el selector del turno del panel de Historial Cerrado
        params.set('turno', document.getElementById('historialFiltroTurno')?.value || 'TODOS');
    }
    else if (panelId === 'panel-historial-completo') {
        params.set('inicio', document.getElementById('ticketFechaInicio')?.value || '');
        params.set('fin', document.getElementById('ticketFechaFin')?.value || '');
        params.set('metodo', document.getElementById('ticketFiltroMetodo')?.value || '');
        params.set('origen', document.getElementById('ticketFiltroOrigen')?.value || '');
        params.set('turno', document.getElementById('ticketFiltroTurno')?.value || '');

        params.set('operacion', document.getElementById('ticketFiltroOperacion')?.value || '');
        params.set('canal', document.getElementById('ticketFiltroCanal')?.value || '');
        params.set('estado', document.getElementById('ticketFiltroEstado')?.value || '');
        params.set('montoMin', document.getElementById('ticketFiltroMontoMin')?.value || '');
        params.set('montoMax', document.getElementById('ticketFiltroMontoMax')?.value || '');

        const seleccion = typeof obtenerSeleccionReporteGlobal === 'function'
            ? obtenerSeleccionReporteGlobal()
            : [];

        if (seleccion.length > 0) {
            params.set('seleccion', seleccion.join(','));
        }
    }

    const urlFinal = params.toString() ? `${urlBase}?${params.toString()}` : urlBase;
    window.location.href = urlFinal;
}

document.addEventListener("DOMContentLoaded", function() {
    setTimeout(actualizarBotonesReporte, 100);
});