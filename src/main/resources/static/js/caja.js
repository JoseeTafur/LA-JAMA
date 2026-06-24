// =========================================================================
// 💎 ENRUTAMIENTO DINÁMICO Y AUDITORÍA EN VIVO PARA LA CAJA (LA JAMA MAESTRO)
// =========================================================================
const LIMITE_ITEMS_PAGINA = 15;
const registrosPorPagina = 8; // Mantenido por consistencia de plugins externos

let selectedPedidoId = null;
let paginaActual = 1;
let paginaActualComprobantes = 0;
let datosPedidoActualCaja = null;

// Variables globales para mantener el estado de cada pestaña indexada
let estadoPaginacionCaja = {
    'panel-por-cobrar': { pagina: 1, tablaId: 'tablaPorCobrarLocal', infoId: 'infoPagPorCobrar', paginadorId: 'paginadorPorCobrar' },
    'panel-liquidados': { pagina: 1, tablaId: 'tablaHistorialLiquidadosTurno', infoId: 'infoPagLiquidados', paginadorId: 'paginadorLiquidados' },
    'panel-movimientos-turno': { pagina: 1, tablaId: 'panel-movimientos-turno', infoId: 'infoPagMovimientos', paginadorId: 'paginadorMovimientos' }
};

// ── 1. GESTIÓN COHESIVA DE PESTAÑAS Y NAVEGACIÓN ──────────────────────
function cambiarPestañaCaja(idPanel, boton) {
    document.querySelectorAll('.jama-tab-panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.jama-tab-link').forEach(b => b.classList.remove('activo'));

    const panel = document.getElementById(idPanel);
    if (panel) panel.classList.add('activo');

    if (boton && boton.classList.contains('jama-tab-link')) {
        boton.classList.add('activo');
    }
    console.log(`📡 [Navegación] Desplazando foco a segmento: ${idPanel}`);
}

// ── 2. CONTROL CENTRALIZADO DE MODALES COHESIVOS (BOOTSTRAP 5 API) ──
function abrirModalLocal(id) {
    const modalElement = document.getElementById(id);
    if (!modalElement) return;

    let modalBootstrap = bootstrap.Modal.getInstance(modalElement);
    if (!modalBootstrap) {
        modalBootstrap = new bootstrap.Modal(modalElement);
    }
    modalBootstrap.show();
    console.log(`📥 [Modales] Desplegando ventana: ${id}`);
}

function cerrarModalLocal(id) {
    const modalElement = document.getElementById(id);
    if (!modalElement) return;

    const modalBootstrap = bootstrap.Modal.getInstance(modalElement);
    if (modalBootstrap) {
        modalBootstrap.hide();
    }
}

// Respaldo preventivo por herencia de botones antiguos
function abrirModal(id) { abrirModalLocal(id); }
function cerrarModal(id) { cerrarModalLocal(id); }

// ── 3. MOTOR COMPLETO DE PAGINACIÓN LOCAL EN CAPA DE CLIENTE ──
function ejecutarPaginacionUnificadaCaja(panelKey) {
    const config = estadoPaginacionCaja[panelKey];
    if (!config) return;

    const contenedorPanel = document.getElementById(panelKey);
    if (!contenedorPanel) return;

    const tabla = contenedorPanel.querySelector('table');
    const infoSpan = document.getElementById(config.infoId);
    const paginadorUl = document.getElementById(config.paginadorId);

    if (!tabla || !infoSpan || !paginadorUl) return;

    // 🛡️ ADUANA CRÍTICA: Captura sólo filas válidas que pasaron el filtro asíncrono
    const filas = Array.from(tabla.querySelectorAll('tbody tr')).filter(tr => {
        return tr.classList.contains('fila-pedido-caja') && tr.getAttribute('data-excluido-filtro') !== 'true';
    });

    const totalRegistros = filas.length;
    const totalPaginas = Math.ceil(totalRegistros / LIMITE_ITEMS_PAGINA) || 1;

    if (config.pagina > totalPaginas) config.pagina = totalPaginas;
    if (config.pagina < 1) config.pagina = 1;

    // Ocultar de forma limpia todos los renglones
    tabla.querySelectorAll('tbody tr.fila-pedido-caja').forEach(f => f.style.setProperty('display', 'none', 'important'));

    const inicio = (config.pagina - 1) * LIMITE_ITEMS_PAGINA;
    const fin = Math.min(inicio + LIMITE_ITEMS_PAGINA, totalRegistros);

    // Encender el segmento exacto de la paginación líquida
    for (let i = inicio; i < fin; i++) {
        if (filas[i]) {
            filas[i].style.removeProperty('display');
        }
    }

    infoSpan.innerText = totalRegistros === 0
        ? "Mostrando 0 registros"
        : `Mostrando del ${inicio + 1} al ${fin} de ${totalRegistros} registros`;

    paginadorUl.innerHTML = "";

    // Botón Anterior
    const liPrev = document.createElement('li');
    liPrev.className = `page-item-jama ${config.pagina === 1 ? 'disabled' : ''}`;
    liPrev.innerHTML = `<button type="button" class="page-link-jama">Anterior</button>`;
    liPrev.onclick = function() {
        if (config.pagina > 1) {
            config.pagina--;
            ejecutarPaginacionUnificadaCaja(panelKey);
        }
    };
    paginadorUl.appendChild(liPrev);

    // Números de páginas intercalados
    for (let p = 1; p <= totalPaginas; p++) {
        const liPag = document.createElement('li');
        liPag.className = `page-item-jama ${p === config.pagina ? 'active' : ''}`;
        liPag.innerHTML = `<button type="button" class="page-link-jama">${p}</button>`;
        liPag.onclick = function() {
            config.pagina = p;
            ejecutarPaginacionUnificadaCaja(panelKey);
        };
        paginadorUl.appendChild(liPag);
    }

    // Botón Siguiente
    const liNext = document.createElement('li');
    liNext.className = `page-item-jama ${config.pagina === totalPaginas ? 'disabled' : ''}`;
    liNext.innerHTML = `<button type="button" class="page-link-jama">Siguiente</button>`;
    liNext.onclick = function() {
        if (config.pagina < totalPaginas) {
            config.pagina++;
            ejecutarPaginacionUnificadaCaja(panelKey);
        }
    };
    paginadorUl.appendChild(liNext);
}

// ── 4. FILTRADO MULTIVARIABLE EN CALIENTE (LIQUIDADOS) ──
function ejecutarFiltradoHistorialEnCaliente() {
    const textoInput = document.getElementById('filtroAsincronoTexto').value.toLowerCase();
    const metodoInput = document.getElementById('filtroAsincronoMetodo').value;
    const origenInput = document.getElementById('filtroAsincronoOrigen').value;

    const tabla = document.getElementById('tablaHistorialLiquidadosTurno');
    if (!tabla) return;

    const filas = tabla.querySelectorAll('tbody tr.fila-pedido-caja');

    filas.forEach(fila => {
        const contenidoFila = fila.textContent.toLowerCase();

        // 🕵️‍♂️ DETECCION SEGURA: En lugar de leer texto plano, detecta las clases de los nuevos cuadros
        let metodoFila = 'EFECTIVO';
        if (fila.querySelector('.bm-tarjeta')) {
            metodoFila = 'TARJETA';
        } else if (fila.querySelector('.bm-digital')) {
            metodoFila = 'YAPE';
        }

        let origenFila = 'DELIVERY';
        if (contenidoFila.includes('salón') || contenidoFila.includes('salon')) origenFila = 'SALON';

        const coincideTexto = contenidoFila.includes(textoInput);
        const coincideMetodo = (metodoInput === 'TODOS' || metodoFila === metodoInput);
        const coincideOrigen = (origenInput === 'TODOS' || origenFila === origenInput);

        if (coincideTexto && coincideMetodo && coincideOrigen) {
            fila.removeAttribute('data-excluido-filtro');
        } else {
            fila.setAttribute('data-excluido-filtro', 'true');
        }
    });

    // 🚀 Integración: Reseteamos a página 1 y re-paginamos dinámicamente
    estadoPaginacionCaja['panel-liquidados'].pagina = 1;
    ejecutarPaginacionUnificadaCaja('panel-liquidados');
}

function limpiarFiltrosHistorialAsincrono() {
    document.getElementById('filtroAsincronoTexto').value = '';
    document.getElementById('filtroAsincronoMetodo').value = 'TODOS';
    document.getElementById('filtroAsincronoOrigen').value = 'TODOS';

    ejecutarFiltradoHistorialEnCaliente();
    AppUtils.showNotification("Filtros contables restaurados", "success");
}

// ── 5. INITIALIZER (DOM CONTENT LOADED - REACUPLADO COMPLETO) ──
document.addEventListener('DOMContentLoaded', function() {
    // A. Captura de Banners Operativos de Inyección
    if (document.getElementById('param-aprobado')) AppUtils.showNotification("Pedido enviado a cocina.", "success");
    if (document.getElementById('param-success')) AppUtils.showNotification("¡Cobro cuadrado e ingreso registrado!", "success");

    // B. Buscador de barra superior de Comandas Vivas
    const buscador = document.getElementById('buscadorPedido');
    const tablaPorCobrar = document.getElementById('tablaPorCobrarLocal')?.getElementsByTagName('tbody')[0];

    if (buscador && tablaPorCobrar) {
        buscador.addEventListener('keyup', function() {
            const texto = buscador.value.toLowerCase();
            const filas = tablaPorCobrar.getElementsByTagName('tr');

            Array.from(filas).forEach(fila => {
                if(fila.classList.contains('fila-pedido-caja')) {
                    const coincide = fila.textContent.toLowerCase().includes(texto);
                    if (coincide) {
                        fila.removeAttribute('data-excluido-filtro');
                    } else {
                        fila.setAttribute('data-excluido-filtro', 'true');
                    }
                }
            });
            estadoPaginacionCaja['panel-por-cobrar'].pagina = 1;
            ejecutarPaginacionUnificadaCaja('panel-por-cobrar');
        });
    }

    // C. Enlace de escuchadores para Filtros de Liquidados
    const txtBusqueda = document.getElementById('filtroAsincronoTexto');
    const selectMetodo = document.getElementById('filtroAsincronoMetodo');
    const selectOrigen = document.getElementById('filtroAsincronoOrigen');

    if (txtBusqueda && selectMetodo && selectOrigen) {
        txtBusqueda.addEventListener('keyup', ejecutarFiltradoHistorialEnCaliente);
        selectMetodo.addEventListener('change', ejecutarFiltradoHistorialEnCaliente);
        selectOrigen.addEventListener('change', ejecutarFiltradoHistorialEnCaliente);
    }

    // D. Renderizado inicializado limpio de las 3 grillas del turno
    ejecutarPaginacionUnificadaCaja('panel-por-cobrar');
    ejecutarPaginacionUnificadaCaja('panel-liquidados');
    ejecutarPaginacionUnificadaCaja('panel-movimientos-turno');
});

// ── 6. CONTROLADORES ASÍNCRONOS DE FLUJOS DE AUDITORÍA Y BACKEND ──
function abrirPlanoMesasDesdeCaja() {
    const iframe = document.getElementById('iframePlanoMesas');
    if (iframe) iframe.contentWindow.location.reload();
    abrirModalLocal('modalPlanoMesasCaja');
}

function verDetallesComandaAuditoria(btn) {
    const pedidoId = btn.getAttribute('data-id');
    AppUtils.showLoading(true);

    fetch(`/admin/caja/api/pedido/${pedidoId}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            AppUtils.showLoading(false);
            const totalSeguro = data.montoTotal ? parseFloat(data.montoTotal).toFixed(2) : "0.00";

            document.getElementById('auditoriaIdPedido').innerText = data.id;
            document.getElementById('auditoriaTipo').innerText = data.tipoPedido;
            document.getElementById('auditoriaMesa').innerText = data.numeroMesa || "N/A";
            document.getElementById('auditoriaTotal').innerText = totalSeguro;

            const lista = document.getElementById('auditoriaListaPlatos');
            lista.innerHTML = "";

            if (data.detalles && data.detalles.length > 0) {
                data.detalles.forEach(d => {
                    if (d.canceladoPorCliente) return;
                    const subtotalItem = d.subtotal ? parseFloat(d.subtotal).toFixed(2) : "0.00";

                    lista.innerHTML += `
                        <div class="jama-detalle-item" style="display:flex; justify-content:space-between; font-size:0.9rem; padding:4px 0; border-bottom:1px dashed rgba(0,0,0,0.04);">
                            <span><strong class="text-success">${d.cantidad}x</strong> ${d.producto?.nombre || 'Plato Desconocido'}</span>
                            <span class="fw-bold">S/. ${subtotalItem}</span>
                        </div>`;
                });
            }
            abrirModalLocal('modalDetalleAuditoria');
        })
        .catch(() => {
            AppUtils.showLoading(false);
            AppUtils.showNotification("Error al cargar la comanda de auditoría", "error");
        });
}

function inicializarHistorialFechas() {
    const inputInicio = document.getElementById('historialFechaInicio');
    const inputFin = document.getElementById('historialFechaFin');

    if (inputInicio && !inputInicio.value) {
        const hoy = new Date();
        const haceSieteDias = new Date();
        haceSieteDias.setDate(hoy.getDate() - 7);

        inputInicio.value = haceSieteDias.toISOString().split('T')[0];
        inputFin.value = hoy.toISOString().split('T')[0];
        consultarHistorialAsincrono();
    }
}

function consultarHistorialAsincrono() {
    const fechaInicio = document.getElementById('historialFechaInicio').value;
    const fechaFin = document.getElementById('historialFechaFin').value;
    const cuerpoTabla = document.getElementById('cuerpoHistorialCajas');

    if (!fechaInicio || !fechaFin) {
        AppUtils.showNotification("Por favor, selecciona un plazo de días válido.", "error");
        return;
    }

    AppUtils.showLoading(true);

    fetch(`/admin/caja/historial-datos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            AppUtils.showLoading(false);
            cuerpoTabla.innerHTML = "";

            if (data.length === 0) {
                cuerpoTabla.innerHTML = `<tr><td colspan="8" class="text-center py-3 text-muted italic">No se registraron cierres de caja en el rango seleccionado.</td></tr>`;
                return;
            }

            data.forEach(t => {
                const fApertura = t.fechaApertura.replace("T", " ").substring(0, 16);
                const fCierre = t.fechaCierre !== "null" && t.fechaCierre ? t.fechaCierre.replace("T", " ").substring(0, 16) : "Abierto";

                let badgeDiferencia = `<span class="fw-bold text-success">S/. 0.00</span>`;
                if (t.diferencia > 0.05) {
                    badgeDiferencia = `<span class="badge bg-success px-2 py-1 text-white fw-bold">+ S/. ${t.diferencia.toFixed(2)}</span>`;
                } else if (t.diferencia < -0.05) {
                    badgeDiferencia = `<span class="badge bg-danger px-2 py-1 text-white fw-bold">S/. ${t.diferencia.toFixed(2)}</span>`;
                }

                cuerpoTabla.innerHTML += `
                    <tr class="align-middle">
                        <td><span class="badge bg-dark font-monospace">#${t.id}</span></td>
                        <td class="text-muted small">${fApertura}</td>
                        <td class="text-muted small">${fCierre}</td>
                        <td class="fw-bold">S/. ${t.montoApertura.toFixed(2)}</td>
                        <td class="fw-bold text-success">S/. ${t.totalVendido.toFixed(2)}</td>
                        <td class="fw-bold text-secondary">S/. ${t.montoCierre.toFixed(2)}</td>
                        <td>${badgeDiferencia}</td>
                        <td class="text-muted small text-truncate" style="max-width:200px;" title="${t.observaciones || ''}">
                            ${t.observaciones || "<i>Sin apuntes</i>"}
                        </td>
                    </tr>`;
            });
        })
        .catch(() => {
            AppUtils.showLoading(false);
            AppUtils.showNotification("No se pudo extraer la bitácora financiera.", "error");
        });
}

function cambiarPaginaComprobantes(direccion) {
    paginaActualComprobantes += direccion;
    cargarComprobantesHistoricos();
}

function cargarComprobantesHistoricos() {
    const fechaInicio = document.getElementById("ticketFechaInicio").value;
    const fechaFin = document.getElementById("ticketFechaFin").value;
    const metodoPago = document.getElementById("ticketFiltroMetodo").value;
    const tipoServicio = document.getElementById("ticketFiltroOrigen").value;

    const tbody = document.getElementById("cuerpoHistorialComprobantesAsincrono");

    if (!fechaInicio || !fechaFin) {
        Swal.fire({ icon: 'warning', title: 'Parámetros Incompletos', text: 'Por favor, define un rango de fechas.', confirmButtonColor: '#2e7d32' });
        return;
    }

    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-3 text-muted">🛸 Extrayendo comprobantes indexados desde Railway...</td></tr>`;

    let url = `/admin/caja/historial-comprobantes?inicio=${fechaInicio}&fin=${fechaFin}&pagina=${paginaActualComprobantes}`;
    if (metodoPago) url += `&metodoPago=${metodoPago}`;
    if (tipoServicio) url += `&tipoServicio=${tipoServicio}`;

    fetch(url)
        .then(response => { if (!response.ok) throw new Error(); return response.json(); })
        .then(data => {
            tbody.innerHTML = "";
            const lista = data.comprobantes;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted small">No se encontraron comprobantes liquidados ni anulados.</td></tr>`;
                document.getElementById("infoPaginacionComprobantes").innerText = "Mostrando 0 de 0 comprobantes";
                document.getElementById("btnPrevPagina").disabled = true;
                document.getElementById("btnNextPagina").disabled = true;
                return;
            }

            lista.forEach(p => {
                const badgeServicio = (p.tipoServicio === 'DELIVERY') ? '🏍️ Delivery' : '🍽️ Salón';
                const nombreCliente = p.cliente ? p.cliente : 'Cliente General';
                const mesaDetalle = p.mesa ? `<br><small style="color:#777;">Mesa N° ${p.mesa}</small>` : '<br><small style="color:#aaa;">-</small>';

                // 🌟 SE CORRIGIÓ AQUÍ: Generación de Cuadros Premium Idénticos a la Cabecera
                let metodoHTML = '-';
                if (p.metodoPago) {
                    let mp = p.metodoPago.toUpperCase();
                    if (mp === 'EFECTIVO') {
                        metodoHTML = `<span class="badge-metodo-jama bm-efectivo"><img src="/img/Efectivo.png" alt="Efectivo"> Efectivo</span>`;
                    } else if (mp === 'YAPE' || mp === 'PLIN' || mp === 'YAPE_PLIN') {
                        metodoHTML = `<span class="badge-metodo-jama bm-digital"><img src="/img/YapePlin.png" alt="Yape Plin"> Yape/Plin</span>`;
                    } else if (mp === 'TARJETA') {
                        metodoHTML = `<span class="badge-metodo-jama bm-tarjeta"><img src="/img/Tarjeta.png" alt="Tarjeta"> Tarjeta</span>`;
                    }
                }

                const badgeEstado = p.estado === 'PAGADO' || p.estado === 'LIQUIDADO'
                    ? '<span class="badge bg-success text-white fw-bold px-3 py-2 rounded-pill" style="font-size:0.72rem;">LIQUIDADO</span>'
                    : '<span class="badge bg-danger text-white fw-bold px-3 py-2 rounded-pill" style="font-size:0.72rem;">ANULADO</span>';

                const fila = document.createElement("tr");
                fila.className = "fila-pedido-caja";
                fila.innerHTML = `
                    <td><span class="texto-negrita">#${p.id}</span></td>
                    <td><span class="texto-servicio">${badgeServicio}</span></td>
                    <td>
                        <div class="cliente-nombre">${nombreCliente}</div>
                        <div class="cliente-meta-detalles">${mesaDetalle}</div>
                    </td>
                    <td><span class="badge bg-light text-dark font-monospace border px-2 py-1">${p.fecha} (${p.hora || '-'})</span></td>
                    <td><span class="fw-bold text-success">S/ ${p.monto.toFixed(2)}</span></td>

                    <td>${metodoHTML}</td>

                    <td class="text-center">
                        <div class="action-buttons-wrapper justify-content-center">
                            <button type="button" class="action-jama-btn btn-action-edit" data-id="${p.id}" onclick="verDetallesComandaAuditoria(this)">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12s3-7 10-7 9 7 9 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <a href="/admin/caja/ticket-venta/${p.id}" target="_blank" class="action-jama-btn btn-action-edit bg-light-jama" style="border-color: rgba(27,58,44,0.15) !important;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                            </a>
                        </div>
                    </td>
                    <td class="text-end">${badgeEstado}</td>
                `;
                tbody.appendChild(fila);
            });

            const totalElementos = data.totalElementos;
            const pagina = data.paginaActual;
            const totalPaginas = data.totalPaginas;

            document.getElementById("infoPaginacionComprobantes").innerText = `Mostrando registros del ${(pagina * 20) + 1} al ${Math.min((pagina + 1) * 20, totalElementos)} (Total: ${totalElementos})`;
            document.getElementById("btnPrevPagina").disabled = (pagina === 0);
            document.getElementById("btnNextPagina").disabled = (pagina >= totalPaginas - 1);
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3">💥 Error al consultar la bitácora: ${err.message}</td></tr>`;
        });
}

// 🚀 REPARADO CON AUDITORÍA EXCLUSIVA: Inyección de Checkboxes RiccardoReutilizables
async function abrirFlujoPagoDesdeFila(buttonElement) {
    const pedidoId = buttonElement.getAttribute('data-id');
    const numeroMesa = buttonElement.getAttribute('data-mesa') || "N/A";

    currentPedidoId = parseInt(pedidoId);
    currentMesaNumero = numeroMesa;
    currentMesaId = buttonElement.getAttribute('data-mesa-id') || 1;

    console.log(`🔎 [DEBUG JAMA] Iniciando cobro de Orden N° #${pedidoId} | Mesa: ${numeroMesa}`);

    try {
        const response = await fetch(`/admin/caja/api/pedido/${pedidoId}`);
        if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

        datosPedidoActualCaja = await response.json();

        // 🔬 MONITOR MAESTRO: Imprime el objeto real que viene desde Java para auditar sus variables
        console.log("📦 [DEBUG JAMA] Objeto JSON recibido del Backend:", datosPedidoActualCaja);

        document.getElementById('lblMesaPrevisualizarCaja').innerText = numeroMesa;
        const contenedorPlatos = document.getElementById('listaPlatosPrevisualizarCaja');
        contenedorPlatos.innerHTML = '';

        // Captura tolerante: Evaluamos si tu DTO lo empaquetó como "detalles" o "listaDetalles"
        const arrayPlatosReceta = datosPedidoActualCaja.detalles || datosPedidoActualCaja.listaDetalles;

        console.log("📋 [DEBUG JAMA] Detalles de platos extraídos:", arrayPlatosReceta);

        if (arrayPlatosReceta && arrayPlatosReceta.length > 0) {
            arrayPlatosReceta.forEach((d) => {
                if (d.canceladoPorCliente) return;

                // Extrae el nombre del plato buscando mapeos aninados o planos
                let nombrePlatoComercial = "Plato Desconocido";
                if (d.producto && d.producto.nombre) {
                    nombrePlatoComercial = d.producto.nombre;
                } else if (d.nombreProducto) {
                    nombrePlatoComercial = d.nombreProducto;
                }

                // Aseguramos que el subtotal matemático no venga nulo
                const subtotalSeguro = d.subtotal != null ? parseFloat(d.subtotal) : 0.00;

                const rowPlato = document.createElement('div');
                rowPlato.className = "d-flex align-items-center justify-content-between p-2 rounded-3 mb-1";
                rowPlato.style = d.pagado ? "background-color: #f3f4f6; opacity: 0.6;" : "background-color: #fff; border: 1px solid rgba(27,58,44,0.1);";

                const checkDisabled = d.pagado ? "disabled" : "";
                const checkChecked = d.pagado ? "" : "checked";
                const badgeEstado = d.pagado ? `<span class="badge bg-secondary">Pagado</span>` : `<span class="badge bg-success">En Mesa</span>`;

                // 🛠️ ID único dinámico por renglón de cobro de caja
                const idCheckCajaUnico = `cbx_caja_${d.id}`;

                // 🌟 INYECCIÓN DE ARQUITECTURA DE CHECKBOX PREMIUM LIQUIDA (JELLY ANIMATED)
                rowPlato.innerHTML = `
                    <div class="cntr">
                        <input type="checkbox"
                               id="${idCheckCajaUnico}"
                               class="hidden-xs-up chk-plato-caja-seleccion"
                               value="${d.id}"
                               ${checkChecked}
                               ${checkDisabled}
                               data-precio="${subtotalSeguro}"
                               onchange="recalcularSubtotalModalCaja()">
                        <label for="${idCheckCajaUnico}" class="cbx"></label>
                        <label for="${idCheckCajaUnico}" class="lbl d-inline-flex align-items-center gap-2" style="cursor:pointer;">
                            <span class="fw-bold text-dark">${d.cantidad}x</span>
                            <span class="fw-semibold text-secondary small">${nombrePlatoComercial}</span>
                        </label>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold font-monospace" style="color: #1B3A2C; font-size: 0.95rem;">S/. ${subtotalSeguro.toFixed(2)}</span>
                        ${badgeEstado}
                    </div>`;
                contenedorPlatos.appendChild(rowPlato);
            });
        } else {
            // Si el array está vacío o indefinido, pintamos una alerta visual de contingencia
            contenedorPlatos.innerHTML = `<div class="text-center py-3 text-danger small"><i class="bi bi-exclamation-circle me-1"></i> Alerta: El servidor retornó 0 platos activos para esta orden.</div>`;
        }

        recalcularSubtotalModalCaja();
        abrirModalLocal('modalPrevisualizarCobroCaja');

    } catch (error) {
        console.error("💥 [DEBUG JAMA CRÍTICO] Falló el hilo de pre-cobro:", error);
        Swal.fire({ icon: 'error', title: 'Fallo de Red', text: 'No se pudo parsear el listado contable del servidor.', confirmButtonColor: '#933D2D' });
    }
}

// 🛠️ ACTUALIZACIÓN DE ADUANA: Intercepta la clase .chk-plato-caja-seleccion oculta por la animación jelly
function recalcularSubtotalModalCaja() {
    let sumaElegida = 0;
    let checkboxesMarcados = 0;

    document.querySelectorAll('.chk-plato-caja-seleccion:checked').forEach(chk => {
        sumaElegida += parseFloat(chk.getAttribute('data-precio')) || 0;
        checkboxesMarcados++;
    });

    document.getElementById('txtSubtotalElegidoCaja').innerText = sumaElegida.toFixed(2);
    const btnProceder = document.getElementById('btnProcederPasarelaCaja');
    if (btnProceder) {
        btnProceder.disabled = (checkboxesMarcados === 0);
        btnProceder.style.opacity = (checkboxesMarcados === 0) ? "0.5" : "1";
    }
}

function avanzarALaquidacionDinamica() {
    cerrarModalLocal('modalPrevisualizarCobroCaja');

    let listaPrevisualizarCaja = document.getElementById('lista-platos-previsualizar');
    if (!listaPrevisualizarCaja) {
        listaPrevisualizarCaja = document.createElement('div');
        listaPrevisualizarCaja.id = 'lista-platos-previsualizar';
        listaPrevisualizarCaja.style.display = 'none';
        document.body.appendChild(listaPrevisualizarCaja);
    }
    listaPrevisualizarCaja.innerHTML = '';

    platosDisponibles = [];
    platosSeleccionadosParaCobro = [];
    let totalConsumoCalculado = 0;
    let indexCobro = 0;

    if (datosPedidoActualCaja && datosPedidoActualCaja.detalles) {
        datosPedidoActualCaja.detalles.forEach((d) => {
            if (d.canceladoPorCliente || d.pagado) return;

            const chk = document.querySelector(`.chk-plato-caja-seleccion[value="${d.id}"]`);
            const quiereCobrar = chk && chk.checked;

            const rowSimulada = document.createElement('div');
            rowSimulada.innerHTML = `<input type="checkbox" class="chk-mesa-confirmar" value="${d.id}" ${quiereCobrar ? 'checked' : ''}>`;
            listaPrevisualizarCaja.appendChild(rowSimulada);

            platosDisponibles.push({
                id: indexCobro,
                productoId: d.producto.id,
                nombre: d.producto.nombre,
                cantidad: d.cantidad,
                subtotal: d.subtotal,
                idTicketAsignado: -1,
                permitidoCobrar: true
            });

            if (quiereCobrar) {
                platosSeleccionadosParaCobro.push(indexCobro);
                totalConsumoCalculado += d.subtotal;
            }
            indexCobro++;
        });
    }

    totalConsumoMesa = Math.round(totalConsumoCalculado * 100) / 100;
    if (typeof inicializarFlujoCaja === 'function') {
        inicializarFlujoCaja(totalConsumoMesa, currentMesaNumero, 'BOLETA', '');
    }

    if (typeof facturacionModal !== 'undefined' && facturacionModal) {
        facturacionModal.show();
    } else {
        const bootstrapModal = new bootstrap.Modal(document.getElementById('modalFacturacion'));
        bootstrapModal.show();
    }
}