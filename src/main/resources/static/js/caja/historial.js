// ============================================================================
// CAJA - AUDITORÍA, HISTORIAL Y FLUJO DE PAGO
// ============================================================================

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
            document.getElementById('auditoriaTipo').innerText     = data.tipoPedido;
            document.getElementById('auditoriaMesa').innerText     = data.numeroMesa || "N/A";
            document.getElementById('auditoriaTotal').innerText    = totalSeguro;

            const lista = document.getElementById('auditoriaListaPlatos');
            lista.innerHTML = '';

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
    const inputFin    = document.getElementById('historialFechaFin');

    if (inputInicio && !inputInicio.value) {
        const hoy = new Date();
        const haceSieteDias = new Date();
        haceSieteDias.setDate(hoy.getDate() - 7);
        inputInicio.value = haceSieteDias.toISOString().split('T')[0];
        inputFin.value    = hoy.toISOString().split('T')[0];
        consultarHistorialAsincrono();
    }
}

function consultarHistorialAsincrono() {
    const fechaInicio  = document.getElementById('historialFechaInicio').value;
    const fechaFin     = document.getElementById('historialFechaFin').value;
    const cuerpoTabla  = document.getElementById('cuerpoHistorialCajas');

    const selectTurno  = document.getElementById('historialFiltroTurno');
    const turnoValor   = selectTurno ? selectTurno.value : 'TODOS';

    if (!fechaInicio || !fechaFin) {
        AppUtils.showNotification("Por favor, selecciona un plazo de días válido.", "error");
        return;
    }

    AppUtils.showLoading(true);

    // 🟩 CORRECCIÓN MASTER 1: El Historial Cerrado consulta estrictamente a /historial-datos
    // Este endpoint te devuelve el Array legítimo de turnos cerrados con sus descuadres.
    fetch(`/admin/caja/historial-datos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&turno=${turnoValor}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            AppUtils.showLoading(false);
            cuerpoTabla.innerHTML = '';

            if (data.length === 0) {
                cuerpoTabla.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-5 text-muted">
                            <div class="d-flex flex-column align-items-center gap-1">
                                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 text-muted opacity-50"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                <span class="fw-semibold" style="font-size: 0.95rem;">No se encontraron resultados</span>
                                <span class="small opacity-75">Prueba ajustando el rango de fechas o el turno seleccionado.</span>
                            </div>
                        </td>
                    </tr>`;
                return;
            }

            data.forEach(t => {
                const fApertura = t.fechaApertura.replace("T", " ").substring(0, 16);
                const fCierre   = t.fechaCierre !== "null" && t.fechaCierre ? t.fechaCierre.replace("T", " ").substring(0, 16) : "Abierto";

                let badgeDiferencia = `<span class="fw-bold text-success">S/. 0.00</span>`;
                if (t.diferencia > 0.05)  badgeDiferencia = `<span class="badge bg-success px-2 py-1 text-white fw-bold">+ S/. ${t.diferencia.toFixed(2)}</span>`;
                else if (t.diferencia < -0.05) badgeDiferencia = `<span class="badge bg-danger px-2 py-1 text-white fw-bold">S/. ${t.diferencia.toFixed(2)}</span>`;

                const badgeTurnoHTML = t.turnoCalculado === "DÍA" || t.turnoCalculado === "DIA"
                    ? `<span class="badge bg-warning text-dark fw-bold"><i class="bi bi-sun-fill"></i> DÍA</span>`
                    : `<span class="badge bg-indigo text-white fw-bold" style="background-color: #4b39b3;"><i class="bi bi-moon-stars-fill"></i> NOCHE</span>`;

                cuerpoTabla.innerHTML += `
                    <tr class="align-middle">
                        <td><span class="badge bg-dark font-monospace">#${t.id}</span></td>
                        <td>${badgeTurnoHTML}</td>
                        <td class="text-muted small">${fApertura}</td>
                        <td class="text-muted small">${fCierre}</td>
                        <td class="fw-bold">S/. ${t.montoApertura.toFixed(2)}</td>
                        <td class="fw-bold text-success">S/. ${t.totalVendido.toFixed(2)}</td>
                        <td class="fw-bold text-secondary">S/. ${t.montoCierre.toFixed(2)}</td>
                        <td>${badgeDiferencia}</td>
                        <td class="text-muted small text-truncate" style="max-width:180px;" title="${t.observaciones || ''}">
                            ${t.observaciones || "<i>Sin apuntes</i>"}
                        </td>
                    </tr>`;
            });
            if (typeof actualizarBotonesReporte === 'function') actualizarBotonesReporte();
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
    const fechaInicio  = document.getElementById("ticketFechaInicio").value;
    const fechaFin     = document.getElementById("ticketFechaFin").value;
    const metodoPago   = document.getElementById("ticketFiltroMetodo").value;
    const tipoServicio = document.getElementById("ticketFiltroOrigen").value;
    const turno        = document.getElementById("ticketFiltroTurno")?.value || "";
    const tbody        = document.getElementById("cuerpoHistorialComprobantesAsincrono");

    if (!fechaInicio || !fechaFin) {
        Swal.fire({ icon: 'warning', title: 'Parámetros Incompletos', text: 'Por favor, define un rango de fechas.', confirmButtonColor: '#2e7d32' });
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-3 text-muted">Extrayendo comprobantes...</td></tr>`;

    let url = `/admin/caja/historial-comprobantes?inicio=${fechaInicio}&fin=${fechaFin}&pagina=${paginaActualComprobantes}`;
    if (metodoPago)   url += `&metodoPago=${metodoPago}`;
    if (tipoServicio) url += `&tipoServicio=${tipoServicio}`;
    if (turno)        url += `&turno=${turno}`;

    fetch(url)
        .then(response => { if (!response.ok) throw new Error(); return response.json(); })
        .then(data => {
            tbody.innerHTML = '';
            const lista = data.comprobantes;

            // =========================================================================
            // 🚀 REFRESH EN CALIENTE DEL DASHBOARD HISTÓRICO (TARJETAS SUPERIORES)
            // =========================================================================
            if (data.metaFondoApertura !== undefined) {
                const txtApertura = document.querySelector('.cr-apertura h3');
                const txtVentas   = document.querySelector('.cr-ventas h3');
                const txtGaveta   = document.querySelector('.tf-efectivo .fw-extrabold');
                const txtTeorico  = document.querySelector('.cr-saldo h3');

                if (txtApertura) txtApertura.innerText = `S/ ${data.metaFondoApertura.toFixed(2)}`;
                if (txtVentas)   txtVentas.innerText   = `S/ ${data.metaTotalVendido.toFixed(2)}`;
                if (txtGaveta)   txtGaveta.innerText   = `S/ ${data.metaEfectivoGaveta.toFixed(2)}`;
                if (txtTeorico)  txtTeorico.innerText  = `S/ ${data.metaEfectivoGaveta.toFixed(2)}`;
            }

            // =========================================================================
            // 🚀 RE-RENDERIZADO DE LA TABLA DE BITÁCORA MANUAL (INDEPENDIENTE Y PURA)
            // =========================================================================
            const tablaMovimientosTurno = document.querySelector('#panel-movimientos-turno table tbody');
            if (tablaMovimientosTurno && data.movimientosManuales) {
                tablaMovimientosTurno.innerHTML = '';

                if (data.movimientosManuales.length === 0) {
                    tablaMovimientosTurno.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center py-5 text-muted">
                                <div class="d-flex flex-column align-items-center gap-1">
                                    <span class="fw-semibold">Sin movimientos manuales</span>
                                    <span class="small opacity-75">No hay ingresos ni egresos en el turno filtrado.</span>
                                </div>
                            </td>
                        </tr>`;
                } else {
                    // 🛡️ REGLA DE PRESENTACIÓN: Clonamos e invertimos la lista para que lo más nuevo salga ARRIBA
                    const movimientosOrdenadosInversos = [...data.movimientosManuales].reverse();

                    movimientosOrdenadosInversos.forEach(m => {
                        const tipoMovimiento = m.tipo ? m.tipo.toString().toUpperCase().trim() : 'INGRESO';
                        const montoSeguro = m.monto ? parseFloat(m.monto) : 0.00;
                        const conceptoSeguro = m.concepto ? m.concepto : 'Movimiento Caja';

                        const badgeTipo = tipoMovimiento === 'EGRESO'
                            ? '<span class="badge bg-danger text-white fw-bold px-2 py-1" style="font-size:0.7rem;">EGRESO</span>'
                            : '<span class="badge bg-success text-white fw-bold px-2 py-1" style="font-size:0.7rem;">INGRESO</span>';

                        const colorMonto = tipoMovimiento === 'EGRESO' ? 'text-danger fw-bold' : 'text-success fw-bold';

                        tablaMovimientosTurno.innerHTML += `
                            <tr class="fila-pedido-caja">
                                <td class="text-muted font-monospace">#M-${m.id}</td>
                                <td>${badgeTipo}</td>
                                <td class="fw-semibold text-dark">${conceptoSeguro}</td>
                                <td><span class="badge bg-light text-dark font-monospace border px-2 py-1">${m.hora || '--:--'}</span></td>
                                <td><span class="${colorMonto}">S/ ${montoSeguro.toFixed(2)}</span></td>
                                <td>
                                    <span class="badge-metodo-jama bm-efectivo">
                                        <img src="/img/Efectivo.png" alt="Efectivo" style="width:14px;height:14px;object-fit:contain;margin-right:4px;"> Efectivo
                                    </span>
                                </td>
                                <td class="text-end text-muted small fw-bold">👤 HISTÓRICO</td>
                            </tr>`;
                    });
                }
            }

            if (!lista || lista.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-5 text-muted">
                            <div class="d-flex flex-column align-items-center gap-1">
                                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 text-muted opacity-50"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                                <span class="fw-semibold" style="font-size: 0.95rem;">No se encontraron resultados</span>
                                <span class="small opacity-75">Prueba ajustando los filtros de búsqueda.</span>
                            </div>
                        </td>
                    </tr>`;
                document.getElementById("infoPaginacionComprobantes").innerText = "Mostrando 0 de 0 comprobantes";
                document.getElementById("btnPrevPagina").disabled = true;
                document.getElementById("btnNextPagina").disabled = true;
                return;
            }

            // =========================================================================
            // 🚀 PASO 2: RENDERIZADO HÍBRIDO CRONOLÓGICO (NOTAS DE VENTA + MANUALES)
            // =========================================================================
            lista.forEach(p => {
                const fila = document.createElement("tr");
                fila.className = "fila-pedido-caja";

                if (p.isMovimientoManual) {
                    // 🛡️ SUB-FLUJO A: Es un movimiento manual de la bitácora
                    const tipoMovimiento = p.estadoPago ? p.estadoPago.toString().toUpperCase().trim() : 'INGRESO';
                    const badgeTipoOperacion = tipoMovimiento === 'EGRESO'
                        ? '<span class="badge bg-danger text-white fw-bold px-2 py-1" style="font-size:0.7rem;">EGRESO</span>'
                        : '<span class="badge bg-success text-white fw-bold px-2 py-1" style="font-size:0.7rem;">INGRESO</span>';

                    const badgeEstado = '<span class="badge text-white fw-bold px-3 py-2 rounded-pill" style="font-size:0.72rem; background-color: #6c757d !important;">MOV. MANUAL</span>';

                    if (tipoMovimiento === 'EGRESO') {
                        fila.style = "background-color: #fffdf5 !important; opacity: 0.95;"; // Color arena sutil para egresos manuales
                    }

                    fila.innerHTML = `
                        <td><span class="badge bg-dark font-monospace" style="font-size:0.82rem; padding: 4px 8px;">#${p.comprobante}</span></td>
                        <td>${badgeTipoOperacion}</td>
                        <td><span class="text-muted">—</span></td>
                        <td>
                            <div class="cliente-nombre fw-bold text-dark text-uppercase" style="font-size: 0.88rem; color: #444;">${p.cliente}</div>
                            <div class="text-muted small fw-semibold" style="font-size:0.75rem; margin-top:2px;"><i class="bi bi-person-gear"></i> Ajuste manual de caja</div>
                        </td>
                        <td><span class="badge bg-light text-dark font-monospace border px-2 py-1">${p.fecha} (${p.hora || '-'})</span></td>
                        <td><span class="fw-bold text-dark">S/ ${p.monto.toFixed(2)}</span></td>
                        <td><span class="badge-metodo-jama bm-efectivo"><img src="/img/Efectivo.png" alt="Efectivo"> Efectivo</span></td>
                        <td class="text-center"><span class="text-muted small italic">—</span></td>
                        <td class="text-end">${badgeEstado}</td>`;

                } else {
                    // 🍔 SUB-FLUJO B: Es una Nota de Venta estándar
                    const servicioCrudo = p.tipoServicio ? p.tipoServicio.toString().toUpperCase().trim() : 'SALON';
                    let textoServicioFinal = 'Salón';
                    let origenBadgeHTML    = `<i class="bi bi-shop me-1"></i> Atendido en Local`;

                    if (servicioCrudo === 'DELIVERY') {
                        textoServicioFinal = 'Delivery';
                        origenBadgeHTML    = `<i class="bi bi-truck me-1"></i> Delivery / Reparto`;
                    } else if (servicioCrudo === 'LLEVAR') {
                        textoServicioFinal = 'Para Llevar';
                        origenBadgeHTML    = `<i class="bi bi-bag-heart-fill me-1"></i> Recojo en Local`;
                    }

                    let nombreIdentificador = "Cliente General";
                    if (p.cliente && p.cliente.trim() !== "" && !p.cliente.includes("Mesa")) {
                        nombreIdentificador = p.cliente;
                    } else if (p.mesa && p.mesa.trim() !== "" && p.mesa !== "0" && p.mesa !== "--" && !p.mesa.toUpperCase().includes("CARTA")) {
                        nombreIdentificador = p.mesa;
                    } else {
                        nombreIdentificador = "Orden #" + p.id;
                    }

                    let metodoHTML = '-';
                    if (p.metodoPago) {
                        const mp = p.metodoPago.toUpperCase();
                        if (mp === 'EFECTIVO') {
                            metodoHTML = `<span class="badge-metodo-jama bm-efectivo"><img src="/img/Efectivo.png" alt="Efectivo"> Efectivo</span>`;
                        } else if (mp === 'YAPE' || mp === 'YAPE_PLIN' || mp === 'PLIN') {
                            metodoHTML = `<span class="badge-metodo-jama bm-digital"><img src="/img/YapePlin.png" alt="Yape Plin"> Yape/Plin</span>`;
                        } else if (mp === 'TARJETA') {
                            metodoHTML = `<span class="badge-metodo-jama bm-tarjeta"><img src="/img/Tarjeta.png" alt="Tarjeta"> Tarjeta</span>`;
                        }
                    }

                    const esAnulado = (p.estadoPago === 'EXTORNADO' || p.estado === 'CANCELADO');
                    const badgeTipoOperacion = esAnulado
                        ? '<span class="badge bg-danger text-white fw-bold px-2 py-1" style="font-size:0.7rem;">EGRESO</span>'
                        : '<span class="badge bg-success text-white fw-bold px-2 py-1" style="font-size:0.7rem;">INGRESO</span>';

                    const badgeEstado = !esAnulado
                        ? '<span class="badge bg-success text-white fw-bold px-3 py-2 rounded-pill" style="font-size:0.72rem;">LIQUIDADO</span>'
                        : '<span class="badge bg-danger text-white fw-bold px-3 py-2 rounded-pill" style="font-size:0.72rem;">ANULADO</span>';

                    if (esAnulado) {
                        fila.style = "background-color: #fff5f5 !important; opacity: 0.75;";
                    }

                    fila.innerHTML = `
                        <td><span class="texto-negrita">#${p.comprobante || ('NV-' + p.id)}</span></td>
                        <td>${badgeTipoOperacion}</td> <td><span class="texto-servicio">${textoServicioFinal}</span></td>
                        <td>
                            <div class="cliente-nombre fw-bold text-dark" style="${esAnulado ? 'text-decoration: line-through; color: #999;' : ''}">${nombreIdentificador}</div>
                            <div class="text-muted small fw-semibold" style="font-size:0.78rem; margin-top:2px;">${origenBadgeHTML}</div>
                        </td>
                        <td><span class="badge bg-light text-dark font-monospace border px-2 py-1">${p.fecha} (${p.hora || '-'})</span></td>
                        <td><span class="${esAnulado ? 'text-danger fw-bold' : 'fw-bold text-success'}" style="${esAnulado ? 'text-decoration: line-through;' : ''}">S/ ${p.monto.toFixed(2)}</span></td>
                        <td>${metodoHTML}</td>
                        <td class="text-center">
                            <div class="action-buttons-wrapper justify-content-center d-flex gap-1">
                                <button type="button" class="action-jama-btn btn-action-edit" data-id="${p.id}" onclick="verDetallesComandaAuditoria(this)">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12s3-7 10-7 9 7 9 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                                <button type="button" class="action-jama-btn btn-action-print bg-light-jama" onclick="window.open('/admin/caja/ticket-venta/${p.id}', '_blank')">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                </button>
                                ${p.estadoPago === 'PAGADO' && (!p.comprobante || !p.comprobante.startsWith('B0') && !p.comprobante.startsWith('F0'))
                                    ? `<button type="button" class="action-jama-btn" onclick="extornarNotaVenta(${p.id}, ${p.monto})" style="background-color:#933D2D; border-color:#7a2e1f; color:#fff; display: inline-flex; align-items: center; justify-content: center;">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                       </button>`
                                    : `<button type="button" class="action-jama-btn" disabled style="background-color:#e5e7eb; border-color:#d1d5db; color:#9ca3af; cursor:not-allowed; opacity:0.5; display: inline-flex; align-items: center; justify-content: center;">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                       </button>`
                                }
                            </div>
                        </td>
                        <td class="text-end">${badgeEstado}</td>`;
                }

                tbody.appendChild(fila);
            });

            const pagina = data.paginaActual;
            document.getElementById("infoPaginacionComprobantes").innerText =
                `Mostrando registros del ${(pagina * 20) + 1} al ${Math.min((pagina + 1) * 20, data.totalElementos)} (Total: ${data.totalElementos})`;
            document.getElementById("btnPrevPagina").disabled = (pagina === 0);
            document.getElementById("btnNextPagina").disabled = (pagina >= data.totalPaginas - 1);

            // 🚀 AÑADIR ESTO: Reevalúa los botones para el Buscador Global
            if (typeof actualizarBotonesReporte === 'function') actualizarBotonesReporte();
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-3">💥 Error al consultar la bitácora: ${err.message}</td></tr>`;
        });
}

async function abrirFlujoPagoDesdeFila(buttonElement) {
    const pedidoId   = buttonElement.getAttribute('data-id');
    const numeroMesa = buttonElement.getAttribute('data-mesa') || "N/A";

    currentPedidoId    = parseInt(pedidoId);
    currentMesaNumero  = numeroMesa;
    currentMesaId      = buttonElement.getAttribute('data-mesa-id') || 1;

    try {
        const response = await fetch(`/admin/caja/api/pedido/${pedidoId}`);
        if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);

        datosPedidoActualCaja = await response.json();

        document.getElementById('lblMesaPrevisualizarCaja').innerText = numeroMesa;
        const contenedorPlatos = document.getElementById('listaPlatosPrevisualizarCaja');
        contenedorPlatos.innerHTML = '';

        const arrayPlatos = datosPedidoActualCaja.detalles || datosPedidoActualCaja.listaDetalles;

        if (arrayPlatos && arrayPlatos.length > 0) {
            arrayPlatos.forEach(d => {
                if (d.canceladoPorCliente) return;

                let nombrePlato = "Plato Desconocido";
                if (d.producto && d.producto.nombre) nombrePlato = d.producto.nombre;
                else if (d.nombreProducto)           nombrePlato = d.nombreProducto;

                const subtotalSeguro = d.subtotal != null ? parseFloat(d.subtotal) : 0.00;
                const checkDisabled  = d.pagado ? "disabled" : "";
                const checkChecked   = d.pagado ? "" : "checked";
                const badgeEstado    = d.pagado ? `<span class="badge bg-secondary">Pagado</span>` : `<span class="badge bg-success">En Mesa</span>`;
                const idCheck        = `cbx_caja_${d.id}`;

                const rowPlato = document.createElement('div');
                rowPlato.className = "d-flex align-items-center justify-content-between p-2 rounded-3 mb-1";
                rowPlato.style     = d.pagado ? "background-color: #f3f4f6; opacity: 0.6;" : "background-color: #fff; border: 1px solid rgba(27,58,44,0.1);";

                rowPlato.innerHTML = `
                    <div class="cntr">
                        <input type="checkbox"
                               id="${idCheck}"
                               class="hidden-xs-up chk-plato-caja-seleccion"
                               value="${d.id}"
                               ${checkChecked}
                               ${checkDisabled}
                               data-precio="${subtotalSeguro}"
                               onchange="recalcularSubtotalModalCaja()">
                        <label for="${idCheck}" class="cbx"></label>
                        <label for="${idCheck}" class="lbl d-inline-flex align-items-center gap-2" style="cursor:pointer;">
                            <span class="fw-bold text-dark">${d.cantidad}x</span>
                            <span class="fw-semibold text-secondary small">${nombrePlato}</span>
                        </label>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold font-monospace" style="color: #1B3A2C; font-size: 0.95rem;">S/. ${subtotalSeguro.toFixed(2)}</span>
                        ${badgeEstado}
                    </div>`;
                contenedorPlatos.appendChild(rowPlato);
            });
        } else {
            contenedorPlatos.innerHTML = `<div class="text-center py-3 text-danger small"><i class="bi bi-exclamation-circle me-1"></i> El servidor retornó 0 platos activos para esta orden.</div>`;
        }

        recalcularSubtotalModalCaja();
        abrirModalLocal('modalPrevisualizarCobroCaja');

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Fallo de Red', text: 'No se pudo parsear el listado contable del servidor.', confirmButtonColor: '#933D2D' });
    }
}

function recalcularSubtotalModalCaja() {
    let sumaElegida       = 0;
    let checkboxesMarcados = 0;

    document.querySelectorAll('.chk-plato-caja-seleccion:checked').forEach(chk => {
        sumaElegida += parseFloat(chk.getAttribute('data-precio')) || 0;
        checkboxesMarcados++;
    });

    document.getElementById('txtSubtotalElegidoCaja').innerText = sumaElegida.toFixed(2);
    const btnProceder = document.getElementById('btnProcederPasarelaCaja');
    if (btnProceder) {
        btnProceder.disabled    = (checkboxesMarcados === 0);
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

    platosDisponibles             = [];
    platosSeleccionadosParaCobro  = [];
    let totalConsumoCalculado     = 0;
    let indexCobro                = 0;

    if (datosPedidoActualCaja && datosPedidoActualCaja.detalles) {
        datosPedidoActualCaja.detalles.forEach(d => {
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
        new bootstrap.Modal(document.getElementById('modalFacturacion')).show();
    }
}

async function extornarNotaVenta(pedidoId, montoTotal) {
    const { value: formValues } = await Swal.fire({
        title: '<span style="color: #933D2D; font-weight: 800;">Extornar Nota de Venta</span>',
        html: `
            <div style="text-align: left; font-size: 0.85rem;">
                <p class="mb-3">Estás a punto de anular la <strong>NV #${pedidoId}</strong>
                por un monto de <strong class="text-danger">S/. ${parseFloat(montoTotal).toFixed(2)}</strong>.
                Esta acción es irreversible.</p>
                <label class="fw-bold mb-1 text-dark d-block">Motivo del extorno <span class="text-danger">*</span></label>
                <select id="swal-motivo-extorno" class="form-select form-select-sm mb-3">
                    <option value="">-- Selecciona un motivo --</option>
                    <option value="Error en el pedido">Error en el pedido</option>
                    <option value="Cliente canceló">Cliente canceló</option>
                    <option value="Cobro duplicado">Cobro duplicado</option>
                    <option value="Producto no disponible">Producto no disponible</option>
                    <option value="Error en el monto">Error en el monto</option>
                    <option value="Otro">Otro</option>
                </select>
                <label class="fw-bold mb-1 text-dark d-block">Descripción adicional <span class="text-danger">*</span></label>
                <textarea id="swal-sustento-extorno" class="form-control form-control-sm"
                          rows="2" placeholder="Describe brevemente el motivo..."></textarea>
            </div>`,
        icon: 'warning',
        background: '#FFF7ED',
        showCancelButton: true,
        confirmButtonColor: '#933D2D',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, Extornar NV',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const motivo   = document.getElementById('swal-motivo-extorno').value;
            const sustento = document.getElementById('swal-sustento-extorno').value.trim();

            if (!motivo) {
                Swal.showValidationMessage('Selecciona un motivo.');
                return false;
            }
            if (!sustento) {
                Swal.showValidationMessage('Ingresa una descripción del extorno.');
                return false;
            }
            return { motivo: `${motivo}: ${sustento}` };
        }
    });

    if (!formValues) return;

    Swal.fire({
        title: 'Procesando extorno...',
        text: 'Anulando la nota de venta en el sistema.',
        background: '#FFF7ED',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const response = await fetch('/admin/caja/api/nota-venta/extornar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedidoId: pedidoId, motivo: formValues.motivo })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            await Swal.fire({
                icon: 'success',
                title: '¡Extorno Exitoso!',
                text: data.message,
                confirmButtonColor: '#1B3A2C'
            });
            window.location.reload();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error en Extorno',
                text: data.message || 'No se pudo procesar el extorno.',
                confirmButtonColor: '#933D2D'
            });
        }
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error de Red',
            text: 'No se pudo conectar con el servidor.',
            confirmButtonColor: '#933D2D'
        });
    }
}