/**
 * 📊 LA JAMA - TABLAS: Renderización, filtros cruzados y mensajes vacíos
 * Depende de: comprobantes-shared.js
 */

async function aplicarFiltroPorFecha() {
    const inicio = document.getElementById('filtroCpeFechaInicio').value;
    const fin    = document.getElementById('filtroCpeFechaFin').value;
    const url = new URL('/admin/comprobantes/api/lista', window.location.origin);
    if (inicio) url.searchParams.set('fechaInicio', inicio);
    if (fin)    url.searchParams.set('fechaFin', fin);

    try {
        const res  = await fetch(url.toString());
        const data = await res.json();
        renderizarTablas(data);
    } catch (e) { console.error('Error al cargar comprobantes:', e); }
}

function renderizarTablas(lista) {
    const tbodyPendientes = document.querySelector('#tablaPorEmitir tbody');
    const tbodyEmitidos   = document.querySelector('#tablaEmitidos tbody');
    const tbodyAnulados   = document.querySelector('#tablaAnulados tbody');

    tbodyPendientes.innerHTML = ''; tbodyEmitidos.innerHTML = ''; tbodyAnulados.innerHTML = '';

    lista.forEach(comp => {
        const monto  = parseFloat(comp.montoTotal).toFixed(2);
        const estado = comp.estado || '';
        const estadoPago = comp.estadoPago || '';
        const tipoServicio = comp.tipoServicio || 'SALON';
        const metodoPago = comp.metodoPago || 'EFECTIVO';
        const fechaFormateada = comp.fechaCreacion || '-';

        let mesaLabel = 'Para Llevar';
        if (tipoServicio === 'SALON') {
            mesaLabel = comp.numeroMesa ? `Mesa #${comp.numeroMesa}` : 'Salón';
        } else if (tipoServicio === 'DELIVERY') {
            mesaLabel = 'Delivery';
        } else if (tipoServicio === 'LLEVAR') {
            mesaLabel = 'Para Llevar';
        }

        // CORRECCIÓN DE IDENTIFICADOR: Saneamos el correlativo para que no muestre el ID crudo
        const notaVentaLabel = comp.comprobanteNotaNumero ? comp.comprobanteNotaNumero : (comp.numeroNotaVenta || `NV01-${String(comp.id).padStart(8, '0')}`);

        // ── 1. PESTAÑA: POR EMITIR / NOTAS DE VENTA (8 Columnas) ─────────────────────────
        if (!comp.comprobanteNumero) {
            if (comp.comprobanteNotaNumero && comp.comprobanteNotaNumero.trim() !== '') {
                if (estado !== 'CANCELADO' && estadoPago !== 'EXTORNADO') {
                    tbodyPendientes.insertAdjacentHTML('beforeend', `
                        <tr data-metodo="${metodoPago}" data-origen="${tipoServicio}" class="align-middle fila-pedido-caja">
                            <td class="fw-bold text-dark font-monospace">${comp.comprobanteNotaNumero}</td>
                            <td>${fechaFormateada}</td>
                            <td><span class="badge-origen">${mesaLabel}</span></td>
                            <td class="fw-bold text-dark text-start">${comp.cliente || ''}</td>
                            <td class="fw-bold text-jama-gold">S/. ${monto}</td>
                            <td>${window.badgeMetodoPago(metodoPago)}</td>
                            <td><span class="badge-preferencia">${comp.preferenciaComprobante || 'BOLETA'}</span></td>
                            <td class="text-center">
                                <div class="action-buttons-wrapper justify-content-center">
                                    <button type="button" class="btn-jama-kinetic px-2 py-1 small btn-imprimir" onclick="window.verTicketTermico(${comp.id})" title="Imprimir Ticket Previo" style="background:#4b5563 !important;">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    </button>
                                    <button type="button" class="btn-jama-kinetic px-2 py-1 small btn-timbrar btn-timbrar-trigger" data-id="${comp.id}" data-preferencia="${comp.preferenciaComprobante || 'BOLETA'}" data-documento="${comp.documentoCliente || ''}" onclick="window.capturarYTimbrar(this)" title="Emitir CPE Oficial">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21.2 15c.1-.7.3-1.4.3-2.2a8 8 0 0 0-16 0c0 .8.1 1.5.3 2.2"></path><path d="M12 11v9"></path><polyline points="8 16 12 20 16 16"></polyline></svg>
                                    </button>
                                </div>
                            </td>
                        </tr>`);
                }
            }
            return;
        }

        // ── 2. PESTAÑA: COMPROBANTES ANULADOS (7 Columnas) ───────────────────────────────
        if (estado === 'ANULADO') {
            const notaNum = comp.comprobanteNotaNumero || 'Generando...';
            tbodyAnulados.insertAdjacentHTML('beforeend', `
                <tr class="align-middle text-muted fila-pedido-caja" style="cursor:pointer;background-color:#fdf2f2;" data-bs-toggle="collapse" data-bs-target="#desglose-anulado-${comp.id}" data-metodo="${metodoPago}" data-origen="${tipoServicio}">
                    <td>
                        <div class="fw-bold">
                            <span>NV-${comp.id}</span>
                            <span class="badge bg-secondary ms-1 font-monospace" style="text-decoration:line-through;">${comp.comprobanteNumero}</span>
                        </div>
                    </td>
                    <td class="fw-bold text-danger font-monospace">${notaNum}</td>
                    <td>${fechaFormateada}</td>
                    <td class="fw-semibold text-start text-dark">${comp.cliente || ''}</td>
                    <td class="fw-bold text-danger text-end">S/. ${monto}</td>
                    <td>
                        <span class="badge bg-danger text-light fw-bold px-2 py-1 rounded-pill small" style="font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            ANULADO (CPE)
                        </span>
                    </td>
                    <td class="text-center" onclick="event.stopPropagation();">
                        <div class="action-buttons-wrapper justify-content-center" style="display:flex;gap:6px;align-items:center;">
                            <button type="button" class="text-light shadow-sm action-jama-btn bg-warning border-warning" onclick="window.abrirEditorReemision(${comp.id})" title="Editar y Emitir Nuevo Comprobante Corregido">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr id="desglose-anulado-${comp.id}" class="collapse bg-light">
                    <td colspan="7" class="p-3" style="background-color:#FFF5F5;border-left:4px solid #dc2626;">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <span class="fw-bold small text-muted text-uppercase d-block mb-2">Historial de Auditoría Interna:</span>
                                <div class="p-2 border rounded-3 bg-white font-monospace text-secondary" style="font-size:0.82rem;">
                                    • CPE Referencia: <span>${comp.comprobanteNumero}</span><br>
                                    • NC Liquidadora: <span class="fw-bold text-danger">${notaNum}</span><br>
                                    • Total Devuelto: S/. ${monto}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>`);
            return;
        }

        // ── 3. PESTAÑA: COMPROBANTES EMITIDOS (7 Columnas) ───────────────────────────────
        tbodyEmitidos.insertAdjacentHTML('beforeend', `
            <tr data-metodo="${metodoPago}" data-origen="${tipoServicio}" class="align-middle fila-pedido-caja">
                <td>
                    <div class="d-flex flex-column gap-1">
                        <div class="d-flex align-items-center flex-wrap gap-1">
                            <span class="fw-bold text-dark font-monospace">${notaVentaLabel}</span>
                            <span class="badge bg-secondary ms-1 font-monospace fw-bold" style="font-size: 0.75rem; letter-spacing: 0.3px;">${comp.comprobanteNumero}</span>
                        </div>
                        <small class="text-secondary small fw-medium">${fechaFormateada}</small>
                    </div>
                </td>
                <td><span class="badge-origen">${mesaLabel}</span></td>
                <td class="text-start"><span class="fw-semibold text-dark d-block text-truncate" style="max-width: 220px;">${comp.cliente || ''}</span></td>
                <td class="fw-bold text-jama-gold text-end font-monospace" style="padding-right: 20px; font-size: 0.95rem;">S/. ${monto}</td>
                <td>${window.badgeMetodoPago(metodoPago)}</td>
                <td>
                    <span class="badge-estado-sunat">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="me-1"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        EMITIDO
                    </span>
                </td>
                <td class="text-center">
                    <div class="action-buttons-wrapper justify-content-center" style="display:flex;gap:6px;align-items:center;">
                        <a href="${comp.comprobanteA4Url || '#'}" ${comp.comprobanteA4Url ? 'target="_blank"' : ''} class="action-jama-btn bg-primary border-primary text-light" style="${comp.comprobanteA4Url ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;'}" title="Ver Factura/Boleta Oficial (A4)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg></a>
                        <button type="button" class="action-jama-btn bg-danger border-danger text-light" data-id="${comp.id}" data-cpe="${comp.comprobanteNumero}" onclick="window.capturarYAnular(this)" title="Emitir Nota de Crédito Total">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                        </button>
                    </div>
                </td>
            </tr>`);
    });
    ejecutarFiltroCruzadoComprobantes();
}

function ejecutarFiltroCruzadoComprobantes() {
    const textoVal   = document.getElementById('filtroCpeTexto').value.toLowerCase();
    const fInicioVal = document.getElementById('filtroCpeFechaInicio').value;
    const fFinVal    = document.getElementById('filtroCpeFechaFin').value;
    const metodoVal  = document.getElementById('filtroCpeMetodo').value;
    const origenVal  = document.getElementById('filtroCpeOrigen').value;

    const timestampInicio = fInicioVal ? new Date(fInicioVal + 'T00:00:00').getTime() : null;
    const timestampFin    = fFinVal    ? new Date(fFinVal    + 'T23:59:59').getTime() : null;

    ['tablaPorEmitir', 'tablaEmitidos', 'tablaAnulados'].forEach(idTabla => {
        const tabla = document.getElementById(idTabla); if (!tabla) return;
        tabla.querySelectorAll('tbody tr').forEach(fila => {
            if (fila.id?.startsWith('desglose-anulado-')) return;
            if (fila.classList.contains('fila-vacia-jama')) return;

            const metodoFila   = fila.getAttribute('data-metodo') || 'EFECTIVO';
            const origenFila   = fila.getAttribute('data-origen') || 'SALON';
            const contenidoFila = fila.textContent.toLowerCase();

            let textoFechaCelda = '';
            if (idTabla === 'tablaPorEmitir' && fila.cells[1])          textoFechaCelda = fila.cells[1].textContent;
            else if (idTabla === 'tablaEmitidos' && fila.querySelector('small')) textoFechaCelda = fila.querySelector('small').textContent;
            else if (idTabla === 'tablaAnulados' && fila.cells[2])       textoFechaCelda = fila.cells[2].textContent;

            let coincideFecha = true;
            if (textoFechaCelda && (timestampInicio || timestampFin)) {
                const celdaLimpia = textoFechaCelda.trim().split(' ')[0];
                const partes = celdaLimpia.split('/');
                if (partes.length === 3) {
                    const timeFila = new Date(`${partes[2]}-${partes[1]}-${partes[0]}T12:00:00`).getTime();
                    if (timestampInicio && timeFila < timestampInicio) coincideFecha = false;
                    if (timestampFin   && timeFila > timestampFin)   coincideFecha = false;
                }
            }

            const coincideTexto  = contenidoFila.includes(textoVal);
            let coincideMetodo   = (metodoVal === 'TODOS' || metodoFila === metodoVal);
            if (metodoVal === 'YAPE') coincideMetodo = ['YAPE', 'PLIN', 'YAPE_PLIN'].includes(metodoFila);
            const coincideOrigen = (origenVal === 'TODOS' || origenFila === origenVal);

            if (coincideTexto && coincideMetodo && coincideOrigen && coincideFecha) {
                fila.removeAttribute('data-filtrado-oculto'); fila.style.removeProperty('display');
            } else {
                fila.setAttribute('data-filtrado-oculto', 'true'); fila.style.setProperty('display', 'none', 'important');
            }
        });
        if (window.ejecutarPaginacionComprobantes) window.ejecutarPaginacionComprobantes(idTabla);
    });
    actualizarMensajesVacios();
}

function actualizarMensajesVacios() {
    const hayFiltrosActivos =
        document.getElementById('filtroCpeTexto').value.trim() !== '' ||
        document.getElementById('filtroCpeFechaInicio').value !== '' ||
        document.getElementById('filtroCpeFechaFin').value !== '' ||
        document.getElementById('filtroCpeMetodo').value !== 'TODOS' ||
        document.getElementById('filtroCpeOrigen').value !== 'TODOS';

    const configs = [
        { tablaId: 'tablaPorEmitir', cols: 8, vacioTxt: 'No hay órdenes pendientes de cobro en este turno.', subTxt: 'Todas las notas de venta han sido formalizadas o el turno está limpio.' },
        { tablaId: 'tablaEmitidos',  cols: 7, vacioTxt: 'No se encontraron comprobantes oficiales emitidos.', subTxt: 'Prueba ajustando los parámetros de fecha o los filtros cruzados.' },
        { tablaId: 'tablaAnulados',  cols: 7, vacioTxt: 'Sin Notas de Crédito emitidas en este periodo.',  subTxt: 'No se registran anulaciones estructurales de cara a la SUNAT.' },
    ];

    configs.forEach(({ tablaId, cols, vacioTxt, subTxt }) => {
        const tabla = document.getElementById(tablaId); if (!tabla) return;
        const tbody = tabla.querySelector('tbody');     if (!tbody) return;

        // Evaluamos cuántas filas son visibles actualmente a los ojos del cajero
        const filasVisibles = [...tbody.querySelectorAll('tr')].filter(f => {
            if (f.id?.startsWith('desglose-anulado-')) return false;
            if (f.classList.contains('fila-vacia-jama')) return false;
            const ocultoFiltro = f.getAttribute('data-filtrado-oculto') === 'true';
            const ocultoPag = f.getAttribute('data-pag-oculto') === 'true';
            const displayComputado = window.getComputedStyle(f).display;
            return !ocultoFiltro && !ocultoPag && displayComputado !== 'none';
        });

        // Limpiamos letreros antiguos para evitar duplicados en la vista
        tbody.querySelectorAll('.fila-vacia-jama').forEach(el => el.remove());

        // 🟩 RESTAURACIÓN ESTÉTICA: Si no hay datos, pintamos el contenedor oficial de La Jama
        if (filasVisibles.length === 0) {
            let svg = '';
            let titulo = 'Nada por aquí';
            let descripcion = vacioTxt;

            if (hayFiltrosActivos) {
                titulo = 'No se encontraron resultados';
                descripcion = 'Prueba ajustando los filtros de búsqueda o restableciendo los criterios.';
                svg = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#933D2D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 opacity-75"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
            } else {
                // SVG Premium de caja registradora / documento limpio para La Jama
                svg = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#1B3A2C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 opacity-75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="13" r="3"/><path d="m12 16 2 2-2 2"/></svg>`;
                descripcion = `${vacioTxt} <span class="d-block text-muted mt-1 opacity-75" style="font-size:0.78rem; font-weight:400;">${subTxt}</span>`;
            }

            tbody.insertAdjacentHTML('beforeend', `
                <tr class="fila-vacia-jama">
                    <td colspan="${cols}" class="text-center py-5 text-muted">
                        <div class="d-flex flex-column align-items-center gap-1">
                            ${svg}
                            <span class="fw-bold text-dark" style="font-size: 0.98rem; letter-spacing:-0.2px;">${titulo}</span>
                            <span class="small fw-medium text-secondary px-3" style="max-width: 400px; display:inline-block;">${descripcion}</span>
                        </div>
                    </td>
                </tr>`);
        }
    });
}

function seleccionarMetodo(valor) {
    const select = document.getElementById('filtroCpeMetodo');
    select.value = select.value === valor ? 'TODOS' : valor;
    if (window.actualizarBadgesMetodo) window.actualizarBadgesMetodo();
    ejecutarFiltroCruzadoComprobantes();
}

function limpiarFiltrosComprobantesAsincronos() {
    document.getElementById('filtroCpeTexto').value       = '';
    document.getElementById('filtroCpeFechaInicio').value = '';
    document.getElementById('filtroCpeFechaFin').value    = '';
    document.getElementById('filtroCpeMetodo').value      = 'TODOS';
    document.getElementById('filtroCpeOrigen').value      = 'TODOS';

    if (window.actualizarBadgesMetodo) window.actualizarBadgesMetodo();
    aplicarFiltroPorFecha();

    // 🚀 RESTAURACIÓN SUPREMA: Devolvemos la notificación nativa de La Jama
    if (typeof AppUtils !== "undefined" && typeof AppUtils.showNotification === "function") {
        AppUtils.showNotification("Filtros contables restaurados", "success");
    }
}

window.aplicarFiltroPorFecha = aplicarFiltroPorFecha;
window.renderizarTablas = renderizarTablas;
window.ejecutarFiltroCruzadoComprobantes = ejecutarFiltroCruzadoComprobantes;
window.actualizarMensajesVacios = actualizarMensajesVacios;
window.seleccionarMetodo = seleccionarMetodo;
window.limpiarFiltrosComprobantesAsincronos = limpiarFiltrosComprobantesAsincronos;