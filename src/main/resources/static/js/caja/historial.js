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

    if (!fechaInicio || !fechaFin) {
        AppUtils.showNotification("Por favor, selecciona un plazo de días válido.", "error");
        return;
    }

    AppUtils.showLoading(true);

    fetch(`/admin/caja/historial-datos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            AppUtils.showLoading(false);
            cuerpoTabla.innerHTML = '';

            if (data.length === 0) {
                cuerpoTabla.innerHTML = `<tr><td colspan="8" class="text-center py-3 text-muted italic">No se registraron cierres de caja en el rango seleccionado.</td></tr>`;
                return;
            }

            data.forEach(t => {
                const fApertura = t.fechaApertura.replace("T", " ").substring(0, 16);
                const fCierre   = t.fechaCierre !== "null" && t.fechaCierre ? t.fechaCierre.replace("T", " ").substring(0, 16) : "Abierto";

                let badgeDiferencia = `<span class="fw-bold text-success">S/. 0.00</span>`;
                if (t.diferencia > 0.05)  badgeDiferencia = `<span class="badge bg-success px-2 py-1 text-white fw-bold">+ S/. ${t.diferencia.toFixed(2)}</span>`;
                else if (t.diferencia < -0.05) badgeDiferencia = `<span class="badge bg-danger px-2 py-1 text-white fw-bold">S/. ${t.diferencia.toFixed(2)}</span>`;

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
    const fechaInicio  = document.getElementById("ticketFechaInicio").value;
    const fechaFin     = document.getElementById("ticketFechaFin").value;
    const metodoPago   = document.getElementById("ticketFiltroMetodo").value;
    const tipoServicio = document.getElementById("ticketFiltroOrigen").value;
    const tbody        = document.getElementById("cuerpoHistorialComprobantesAsincrono");

    if (!fechaInicio || !fechaFin) {
        Swal.fire({ icon: 'warning', title: 'Parámetros Incompletos', text: 'Por favor, define un rango de fechas.', confirmButtonColor: '#2e7d32' });
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-3 text-muted">Extrayendo comprobantes...</td></tr>`;

    let url = `/admin/caja/historial-comprobantes?inicio=${fechaInicio}&fin=${fechaFin}&pagina=${paginaActualComprobantes}`;
    if (metodoPago)   url += `&metodoPago=${metodoPago}`;
    if (tipoServicio) url += `&tipoServicio=${tipoServicio}`;

    fetch(url)
        .then(response => { if (!response.ok) throw new Error(); return response.json(); })
        .then(data => {
            tbody.innerHTML = '';
            const lista = data.comprobantes;

            if (!lista || lista.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted small">No se encontraron comprobantes liquidados ni anulados.</td></tr>`;
                document.getElementById("infoPaginacionComprobantes").innerText = "Mostrando 0 de 0 comprobantes";
                document.getElementById("btnPrevPagina").disabled = true;
                document.getElementById("btnNextPagina").disabled = true;
                return;
            }

            lista.forEach(p => {
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

                // 🟩 MODIFICACIÓN: Definición contable visual basada en el estado del registro histórico
                const esAnulado = (p.estado !== 'PAGADO' && p.estado !== 'LIQUIDADO');
                const badgeTipoOperacion = esAnulado
                    ? '<span class="badge bg-danger text-white fw-bold px-2 py-1" style="font-size:0.7rem;">EGRESO</span>'
                    : '<span class="badge bg-success text-white fw-bold px-2 py-1" style="font-size:0.7rem;">INGRESO</span>';

                const badgeEstado = !esAnulado
                    ? '<span class="badge bg-success text-white fw-bold px-3 py-2 rounded-pill" style="font-size:0.72rem;">LIQUIDADO</span>'
                    : '<span class="badge bg-danger text-white fw-bold px-3 py-2 rounded-pill" style="font-size:0.72rem;">ANULADO</span>';

                const fila = document.createElement("tr");
                fila.className = "fila-pedido-caja";
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
                        </div>
                    </td>
                    <td class="text-end">${badgeEstado}</td>`;
                tbody.appendChild(fila);
            });

            const pagina = data.paginaActual;
            document.getElementById("infoPaginacionComprobantes").innerText =
                `Mostrando registros del ${(pagina * 20) + 1} al ${Math.min((pagina + 1) * 20, data.totalElementos)} (Total: ${data.totalElementos})`;
            document.getElementById("btnPrevPagina").disabled = (pagina === 0);
            document.getElementById("btnNextPagina").disabled = (pagina >= data.totalPaginas - 1);
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