function exportarReporteCaja(formato) {
    const tipoFormato = formato.toUpperCase();
    const segmentoActivo = document.querySelector('input[name="cajaSegmento"]:checked');
    if (!segmentoActivo) return;

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
    }
    else if (panelId === 'panel-historial-completo') {
        params.set('inicio', document.getElementById('ticketFechaInicio')?.value || '');
        params.set('fin', document.getElementById('ticketFechaFin')?.value || '');
        params.set('metodo', document.getElementById('ticketFiltroMetodo')?.value || '');
        params.set('origen', document.getElementById('ticketFiltroOrigen')?.value || '');
    }

    const urlFinal = params.toString() ? `${urlBase}?${params.toString()}` : urlBase;
    window.location.href = urlFinal;
}