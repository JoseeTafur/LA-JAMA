/**
 * COMPROBANTES - RENDER DE TABLAS, FILTROS Y PAGINACIÓN
 */

// ============================================================================
// RENDER DE TABLAS
// ============================================================================

async function aplicarFiltroPorFecha() {
    const inicio = document.getElementById('filtroCpeFechaInicio').value;
    const fin    = document.getElementById('filtroCpeFechaFin').value;
    const url    = new URL('/admin/comprobantes/api/lista', window.location.origin);
    if (inicio) url.searchParams.set('fechaInicio', inicio);
    if (fin)    url.searchParams.set('fechaFin', fin);

    try {
        const res  = await fetch(url.toString());
        const data = await res.json();
        renderizarTablas(data);
    } catch (e) {
        console.error('Error al cargar comprobantes:', e);
    }
}

function renderizarTablas(lista) {
    const tbodyPendientes = document.querySelector('#tablaPorEmitir tbody');
    const tbodyEmitidos   = document.querySelector('#tablaEmitidos tbody');
    const tbodyAnulados   = document.querySelector('#tablaAnulados tbody');

    tbodyPendientes.innerHTML = '';
    tbodyEmitidos.innerHTML   = '';
    tbodyAnulados.innerHTML   = '';

    lista.forEach(comp => {
        const mesa   = comp.numeroMesa ? `Mesa #${comp.numeroMesa}` : 'Carta Web';
        const monto  = parseFloat(comp.montoTotal).toFixed(2);
        const estado = comp.estado || '';

        if (!comp.comprobanteNumero) {
            tbodyPendientes.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="fw-bold text-dark">NV-${comp.id}</td>
                    <td>${comp.fechaCreacion}</td>
                    <td><span class="badge-origen">${mesa}</span></td>
                    <td class="fw-bold text-dark text-start">${comp.cliente || ''}</td>
                    <td class="fw-bold text-jama-gold">S/. ${monto}</td>
                    <td>${badgeMetodoPago(comp.metodoPago)}</td>
                    <td><span class="badge-preferencia">${comp.preferenciaComprobante}</span></td>
                    <td class="text-center">
                        <div class="action-buttons-wrapper justify-content-center">
                            <button type="button" class="action-jama-btn btn-imprimir" onclick="verTicketTermico(${comp.id})" title="Imprimir Ticket Previo">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            </button>
                            <button type="button" class="action-jama-btn btn-timbrar btn-timbrar-trigger"
                                    data-id="${comp.id}" data-preferencia="${comp.preferenciaComprobante}" data-documento="${comp.documentoCliente || ''}"
                                    onclick="capturarYTimbrar(this)" title="Emitir CPE Oficial">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.1-.7.3-1.4.3-2.2a8 8 0 0 0-16 0c0 .8.1 1.5.3 2.2"></path><path d="M12 11v9"></path><polyline points="8 16 12 20 16 16"></polyline></svg>
                            </button>
                        </div>
                    </td>
                </tr>`);
            return;
        }

        if (estado === 'ANULADO') {
            const notaNum  = comp.comprobanteNotaNumero || 'Generando...';
            const a4Url    = comp.comprobanteA4Url;
            const pdfUrl   = comp.comprobantePdfUrl;
            const a4Style  = a4Url  ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';
            const pdfStyle = pdfUrl ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';

            tbodyAnulados.insertAdjacentHTML('beforeend', `
                <tr class="align-middle text-muted" style="cursor:pointer;background-color:#fdf2f2;"
                    data-bs-toggle="collapse" data-bs-target="#desglose-anulado-${comp.id}">
                    <td>
                        <div class="fw-bold">
                            <span>NV-${comp.id}</span>
                            <span class="badge bg-secondary ms-1 font-monospace" style="text-decoration:line-through;">${comp.comprobanteNumero}</span>
                        </div>
                    </td>
                    <td class="fw-bold text-danger font-monospace">${notaNum}</td>
                    <td>${comp.fechaCreacion}</td>
                    <td class="fw-semibold text-start text-dark">${comp.cliente || ''}</td>
                    <td class="fw-bold text-danger text-end">S/. ${monto}</td>
                    <td>
                        <span class="badge bg-danger text-light fw-bold px-2 py-1 rounded-pill small" style="font-size:0.72rem;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            ANULADO (CPE)
                        </span>
                    </td>
                    <td class="text-center" onclick="event.stopPropagation();">
                        <div class="action-buttons-wrapper justify-content-center" style="display:flex;gap:6px;align-items:center;">
                            <a href="/admin/comprobantes/imprimir-nota-a4/${comp.id}" target="_blank" class="action-jama-btn bg-primary border-primary text-light" title="Ver Nota de Crédito Oficial (A4)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></a>
                            <a href="/admin/comprobantes/imprimir-nota/${comp.id}" target="_blank" class="action-jama-btn bg-success border-success text-light" title="Imprimir Ticket Nota de Crédito (80mm)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></a>
                            <a href="/admin/comprobantes/xml-nota/${comp.id}" target="_blank" class="action-jama-btn bg-dark border-dark text-light" title="Ver XML Firmado de la Nota de Crédito"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></a>
                            <button type="button" class="action-jama-btn text-light shadow-sm" onclick="abrirEditorReemision(${comp.id})" title="Editar y Emitir Nuevo Comprobante Corregido" style="background-color:#d97706;border-color:#b45309;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
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
                            <div class="text-end" onclick="event.stopPropagation();">
                                <span class="fw-bold small text-muted text-uppercase d-block mb-2">Documentos del CPE Original Afectado:</span>
                                <div class="action-buttons-wrapper" style="display:flex;gap:6px;align-items:center;">
                                    <a href="${a4Url  || '#'}" ${a4Url  ? 'target="_blank"' : ''} class="action-jama-btn bg-primary border-primary text-light"  style="${a4Style}"  title="Ver CPE Original (A4)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></a>
                                    <a href="${pdfUrl || '#'}" ${pdfUrl ? 'target="_blank"' : ''} class="action-jama-btn bg-success border-success text-light" style="${pdfStyle}" title="Imprimir Ticket Original (80mm)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></a>
                                    <a href="/admin/comprobantes/xml/${comp.id}" target="_blank" class="action-jama-btn bg-dark border-dark text-light" title="Ver XML Firmado CPE Original"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></a>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>`);
            return;
        }

        const a4Url    = comp.comprobanteA4Url;
        const pdfUrl   = comp.comprobantePdfUrl;
        const a4Style  = a4Url  ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';
        const pdfStyle = pdfUrl ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';

        tbodyEmitidos.insertAdjacentHTML('beforeend', `
            <tr>
                <td>
                    <div class="fw-bold text-dark">
                        <span>NV-${comp.id}</span>
                        <span class="badge bg-secondary ms-1 font-monospace">${comp.comprobanteNumero}</span>
                    </div>
                    <small class="text-muted">${comp.fechaCreacion}</small>
                </td>
                <td><span class="badge-origen">${mesa}</span></td>
                <td class="fw-bold text-dark text-start">${comp.cliente || ''}</td>
                <td class="fw-bold text-jama-gold text-end">S/. ${monto}</td>
                <td>${badgeMetodoPago(comp.metodoPago)}</td>
                <td><span class="badge-estado-sunat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>EMITIDO</span></td>
                <td class="text-center">
                    <div class="action-buttons-wrapper justify-content-center" style="display:flex;gap:6px;align-items:center;">
                        <a href="${a4Url  || '#'}" ${a4Url  ? 'target="_blank"' : ''} class="action-jama-btn bg-primary border-primary text-light"  style="${a4Style}"  title="Ver Factura/Boleta Oficial (A4)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></a>
                        <a href="${pdfUrl || '#'}" ${pdfUrl ? 'target="_blank"' : ''} class="action-jama-btn bg-success border-success text-light" style="${pdfStyle}" title="Imprimir Ticket (80mm)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></a>
                        <a href="/admin/comprobantes/xml/${comp.id}" target="_blank" class="action-jama-btn bg-dark border-dark text-light" title="Ver XML Firmado SUNAT"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></a>
                        <button type="button" class="action-jama-btn bg-danger border-danger text-light"
                                data-id="${comp.id}" data-cpe="${comp.comprobanteNumero}"
                                onclick="capturarYAnular(this)" title="Emitir Nota de Crédito Total">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                        </button>
                    </div>
                </td>
            </tr>`);
    });

    actualizarMensajesVacios();
}

// ============================================================================
// FILTROS
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    const txtBusqueda = document.getElementById('filtroCpeTexto');
    const fechaInicio = document.getElementById('filtroCpeFechaInicio');
    const fechaFin    = document.getElementById('filtroCpeFechaFin');
    const selectMetodo = document.getElementById('filtroCpeMetodo');
    const selectOrigen = document.getElementById('filtroCpeOrigen');

    if (txtBusqueda && fechaInicio && fechaFin && selectMetodo && selectOrigen) {
        txtBusqueda.addEventListener('keyup', ejecutarFiltroCruzadoComprobantes);
        fechaInicio.addEventListener('change', aplicarFiltroPorFecha);
        fechaFin.addEventListener('change', aplicarFiltroPorFecha);
        selectMetodo.addEventListener('change', ejecutarFiltroCruzadoComprobantes);
        selectOrigen.addEventListener('change', ejecutarFiltroCruzadoComprobantes);
    }
    actualizarMensajesVacios();
});

function ejecutarFiltroCruzadoComprobantes() {
    const textoVal  = document.getElementById('filtroCpeTexto').value.toLowerCase();
    const fInicioVal = document.getElementById('filtroCpeFechaInicio').value;
    const fFinVal   = document.getElementById('filtroCpeFechaFin').value;
    const metodoVal = document.getElementById('filtroCpeMetodo').value;
    const origenVal = document.getElementById('filtroCpeOrigen').value;

    const timestampInicio = fInicioVal ? new Date(fInicioVal + "T00:00:00").getTime() : null;
    const timestampFin    = fFinVal    ? new Date(fFinVal    + "T23:59:59").getTime() : null;

    ['tablaPorEmitir', 'tablaEmitidos', 'tablaAnulados'].forEach(idTabla => {
        const tabla = document.getElementById(idTabla);
        if (!tabla) return;

        tabla.querySelectorAll('tbody tr').forEach(fila => {
            if (fila.id && fila.id.startsWith('desglose-anulado-')) return;

            const contenidoFila = fila.textContent.toLowerCase();

            let metodoFila = 'EFECTIVO';
            if (contenidoFila.includes('tarjeta')) metodoFila = 'TARJETA';
            else if (contenidoFila.includes('yape') || contenidoFila.includes('plin')) metodoFila = 'YAPE';

            let origenFila = 'DELIVERY';
            if (contenidoFila.includes('mesa #') || contenidoFila.includes('salón') || contenidoFila.includes('salon')) origenFila = 'SALON';

            let coincideFecha = true;
            let textoFechaCelda = '';
            if (idTabla === 'tablaPorEmitir' && fila.cells[1]) textoFechaCelda = fila.cells[1].textContent;
            else if (idTabla === 'tablaEmitidos' && fila.querySelector('small')) textoFechaCelda = fila.querySelector('small').textContent;
            else if (idTabla === 'tablaAnulados' && fila.cells[2]) textoFechaCelda = fila.cells[2].textContent;

            if (textoFechaCelda && (timestampInicio || timestampFin)) {
                const partesFecha = textoFechaCelda.trim().split(' ')[0].split('/');
                if (partesFecha.length === 3) {
                    const timeFila = new Date(`${partesFecha[2]}-${partesFecha[1]}-${partesFecha[0]}T12:00:00`).getTime();
                    if (timestampInicio && timeFila < timestampInicio) coincideFecha = false;
                    if (timestampFin    && timeFila > timestampFin)    coincideFecha = false;
                }
            }

            const coincideTexto  = contenidoFila.includes(textoVal);
            const coincideMetodo = (metodoVal === 'TODOS' || metodoFila === metodoVal);
            const coincideOrigen = (origenVal === 'TODOS' || origenFila === origenVal);

            let desgloseHijo = null;
            if (idTabla === 'tablaAnulados') {
                const siguienteFila = fila.nextElementSibling;
                if (siguienteFila?.id?.startsWith('desglose-anulado-')) desgloseHijo = siguienteFila;
            }

            if (coincideTexto && coincideMetodo && coincideOrigen && coincideFecha) {
                fila.style.removeProperty('display');
            } else {
                fila.style.display = 'none';
                if (desgloseHijo) { desgloseHijo.style.display = 'none'; desgloseHijo.classList.remove('show'); }
            }
        });
    });

    actualizarMensajesVacios();
}

function limpiarFiltrosComprobantesAsincronos() {
    document.getElementById('filtroCpeTexto').value      = '';
    document.getElementById('filtroCpeFechaInicio').value = '';
    document.getElementById('filtroCpeFechaFin').value    = '';
    document.getElementById('filtroCpeMetodo').value     = 'TODOS';
    document.getElementById('filtroCpeOrigen').value     = 'TODOS';
    aplicarFiltroPorFecha();
    if (typeof Swal !== 'undefined') {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Filtros restaurados', showConfirmButton: false, timer: 1800 });
    }
}

function actualizarMensajesVacios() {
    const hayFiltros =
        document.getElementById('filtroCpeTexto').value.trim() !== '' ||
        document.getElementById('filtroCpeFechaInicio').value !== '' ||
        document.getElementById('filtroCpeFechaFin').value !== '' ||
        document.getElementById('filtroCpeMetodo').value !== 'TODOS' ||
        document.getElementById('filtroCpeOrigen').value !== 'TODOS';

    [{ tablaId: 'tablaPorEmitir', cols: 8 }, { tablaId: 'tablaEmitidos', cols: 7 }, { tablaId: 'tablaAnulados', cols: 7 }].forEach(({ tablaId, cols }) => {
        const tabla = document.getElementById(tablaId);
        if (!tabla) return;
        const tbody = tabla.querySelector('tbody');
        const filas = [...tbody.querySelectorAll('tr')].filter(f => !f.id?.startsWith('desglose-anulado-') && f.style.display !== 'none');
        const previo = tbody.querySelector('.fila-vacia-jama');
        if (previo) previo.remove();

        if (filas.length === 0) {
            const mensaje   = hayFiltros ? 'No se encontraron resultados' : 'Nada por aquí';
            const subtexto  = hayFiltros ? 'Prueba ajustando los filtros de búsqueda.' : 'Aún no hay registros en este turno.';
            tbody.insertAdjacentHTML('beforeend', `
                <tr class="fila-vacia-jama">
                    <td colspan="${cols}" class="text-center py-5 text-muted">
                        <div class="d-flex flex-column align-items-center gap-1">
                            <span class="fw-semibold" style="font-size: 0.95rem;">${mensaje}</span>
                            <span class="small opacity-75">${subtexto}</span>
                        </div>
                    </td>
                </tr>`);
        }
    });
}

function seleccionarMetodo(valor) {
    const select = document.getElementById('filtroCpeMetodo');
    select.value = select.value === valor ? 'TODOS' : valor;
    ejecutarFiltroCruzadoComprobantes();
}

function badgeMetodoPago(metodo) {
    const m = (metodo || 'EFECTIVO').toUpperCase();
    const badges = {
        'EFECTIVO':   `<span class="badge-metodo-jama bm-efectivo"><img src="/img/Efectivo.png" alt="Efectivo" style="width:13px;height:13px;object-fit:contain;"> Efectivo</span>`,
        'YAPE':       `<span class="badge-metodo-jama bm-digital"><img src="/img/Yape.png" alt="Yape" style="width:13px;height:13px;object-fit:contain;"> Yape</span>`,
        'PLIN':       `<span class="badge-metodo-jama bm-plin"><img src="/img/Plin.png" alt="Plin" style="width:13px;height:13px;object-fit:contain;"> Plin</span>`,
        'TARJETA':    `<span class="badge-metodo-jama bm-tarjeta"><img src="/img/Tarjeta.png" alt="Tarjeta" style="width:13px;height:13px;object-fit:contain;"> Tarjeta</span>`,
    };
    return badges[m] || `<span class="badge-metodo-jama bm-digital"><img src="/img/YapePlin.png" alt="Yape/Plin" style="width:13px;height:13px;object-fit:contain;"> Yape/Plin</span>`;
}

// ============================================================================
// PAGINACIÓN
// ============================================================================

const LIMITE_COMPROBANTES_PAGINA = 15;

let estadoPaginacionComprobantes = {
    'tablaPorEmitir': { pagina: 1, infoId: 'infoPagPorEmitir',  paginadorId: 'paginadorPorEmitir'  },
    'tablaEmitidos':  { pagina: 1, infoId: 'infoPagEmitidos',   paginadorId: 'paginadorEmitidos'   },
    'tablaAnulados':  { pagina: 1, infoId: 'infoPagAnulados',   paginadorId: 'paginadorAnulados'   },
};

function ejecutarPaginacionComprobantes(tablaId) {
    const config = estadoPaginacionComprobantes[tablaId];
    if (!config) return;

    const tabla       = document.getElementById(tablaId);
    const infoSpan    = document.getElementById(config.infoId);
    const paginadorUl = document.getElementById(config.paginadorId);
    if (!tabla || !infoSpan || !paginadorUl) return;

    const filas = Array.from(tabla.querySelectorAll('tbody tr')).filter(tr =>
        !tr.id?.startsWith('desglose-anulado-') &&
        !tr.classList.contains('fila-vacia-jama') &&
        tr.style.display !== 'none'
    );

    const total        = filas.length;
    const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_COMPROBANTES_PAGINA));
    config.pagina = Math.min(Math.max(config.pagina, 1), totalPaginas);

    tabla.querySelectorAll('tbody tr').forEach(tr => {
        if (!tr.id?.startsWith('desglose-anulado-') && !tr.classList.contains('fila-vacia-jama') && tr.style.display !== 'none') {
            tr.setAttribute('data-pag-oculto', 'true');
            tr.style.setProperty('display', 'none', 'important');
        }
    });

    const inicio = (config.pagina - 1) * LIMITE_COMPROBANTES_PAGINA;
    const fin    = Math.min(inicio + LIMITE_COMPROBANTES_PAGINA, total);

    for (let i = inicio; i < fin; i++) {
        if (filas[i]) {
            filas[i].removeAttribute('data-pag-oculto');
            filas[i].style.removeProperty('display');
            const siguiente = filas[i].nextElementSibling;
            if (siguiente?.id?.startsWith('desglose-anulado-')) siguiente.style.removeProperty('display');
        }
    }

    infoSpan.innerText = total === 0 ? 'Mostrando 0 registros' : `Mostrando ${inicio + 1}–${fin} de ${total} registros`;

    paginadorUl.innerHTML = '';

    const liPrev = document.createElement('li');
    liPrev.className = `page-item-jama ${config.pagina === 1 ? 'disabled' : ''}`;
    liPrev.innerHTML = `<button type="button" class="page-link-jama">Anterior</button>`;
    liPrev.onclick = () => { if (config.pagina > 1) { config.pagina--; ejecutarPaginacionComprobantes(tablaId); } };
    paginadorUl.appendChild(liPrev);

    const rango = 2;
    for (let p = 1; p <= totalPaginas; p++) {
        const esExtremo = p === 1 || p === totalPaginas;
        const esCercano = Math.abs(p - config.pagina) <= rango;
        if (!esExtremo && !esCercano) {
            const ultimo = paginadorUl.lastElementChild;
            if (ultimo && !ultimo.classList.contains('elipsis-jama')) {
                const liElipsis = document.createElement('li');
                liElipsis.className = 'page-item-jama elipsis-jama disabled';
                liElipsis.innerHTML = `<span class="page-link-jama" style="cursor:default;">…</span>`;
                paginadorUl.appendChild(liElipsis);
            }
            continue;
        }
        const liPag = document.createElement('li');
        liPag.className = `page-item-jama ${p === config.pagina ? 'active' : ''}`;
        liPag.innerHTML = `<button type="button" class="page-link-jama">${p}</button>`;
        liPag.onclick = () => { config.pagina = p; ejecutarPaginacionComprobantes(tablaId); };
        paginadorUl.appendChild(liPag);
    }

    const liNext = document.createElement('li');
    liNext.className = `page-item-jama ${config.pagina === totalPaginas ? 'disabled' : ''}`;
    liNext.innerHTML = `<button type="button" class="page-link-jama">Siguiente</button>`;
    liNext.onclick = () => { if (config.pagina < totalPaginas) { config.pagina++; ejecutarPaginacionComprobantes(tablaId); } };
    paginadorUl.appendChild(liNext);
}

function repaginarTodas() {
    Object.keys(estadoPaginacionComprobantes).forEach(id => {
        estadoPaginacionComprobantes[id].pagina = 1;
        ejecutarPaginacionComprobantes(id);
    });
}
