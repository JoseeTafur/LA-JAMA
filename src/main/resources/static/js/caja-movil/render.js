// ============================================================================
// CAJA MÓVIL - RENDER DE PLATOS Y TICKETS
// ============================================================================

function renderizarPlatos() {
    const contenedor = document.getElementById('lista-items-repartir');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    platosDisponibles.forEach(p => {
        if (p.idTicketAsignado >= ticketsDeCobro.length) p.idTicketAsignado = -1;

        const estaAsignado = p.idTicketAsignado !== -1;
        const clAsignado = estaAsignado ? 'assigned' : '';
        let txtBadge = 'Libre';
        let colorBadge = 'bg-secondary text-light';

        if (estaAsignado) {
            const ticketAsociado = ticketsDeCobro[p.idTicketAsignado];
            const consumoTotalTicket = Math.round((ticketAsociado.montoPlatos + ticketAsociado.montoLibre) * 100) / 100;
            if (ticketAsociado.montoLibre > 0 && totalConsumoMesa > 0) {
                const porcentajeReal = Math.round((consumoTotalTicket / totalConsumoMesa) * 100);
                txtBadge = `T-${p.idTicketAsignado + 1} (${porcentajeReal}%)`;
            } else {
                txtBadge = `T-${p.idTicketAsignado + 1}`;
            }
            txtBadge += ` <span class="jama-btn-del-owner" onclick="removerClienteDePlato(event, ${p.id})">&times;</span>`;
            colorBadge = 'bg-warning text-dark d-inline-flex align-items-center gap-1';
        }

        let checkboxHTML = '';
        let estiloFila = '';

        if (p.permitidoCobrar) {
            const checkedAttr = platosSeleccionadosParaCobro.includes(p.id) ? 'checked' : '';
            checkboxHTML = `
                <input type="checkbox" class="form-check-input chk-cobro-parcial"
                       style="width: 18px; height: 18px; cursor: pointer; border: 2px solid #1B3A2C; margin-right: 8px;"
                       value="${p.id}" ${checkedAttr}
                       onclick="alternarSeleccionPlatoCobro(event, ${p.id})">`;
        } else {
            checkboxHTML = `<input type="checkbox" class="form-check-input text-muted opacity-50" style="margin-right: 8px;" disabled title="Aún en cocina">`;
            estiloFila = 'opacity: 0.5; background-color: #f3f4f6; cursor: not-allowed;';
        }

        contenedor.innerHTML += `
            <div class="jama-item-row-btn ${clAsignado} d-flex align-items-center" style="${estiloFila}" onclick="preguntarDestinoPlato(${p.id})">
                <div class="d-flex align-items-center" onclick="event.stopPropagation();">
                    ${checkboxHTML}
                </div>
                <div class="d-flex justify-content-between align-items-center flex-grow-1">
                    <span class="small fw-semibold text-truncate" style="max-width: 60%;">${p.cantidad}x ${p.nombre}</span>
                    <div class="d-flex gap-2 align-items-center">
                        <span class="small fw-bold">S/. ${p.subtotal.toFixed(2)}</span>
                        <span class="badge ${colorBadge}">${txtBadge}</span>
                    </div>
                </div>
            </div>`;
    });
}

function renderizarTickets() {
    const contenedor = document.getElementById('contenedor-tickets-dinamicos');
    if (!contenedor) return;

    const elementoActivo = document.activeElement;
    let idTicketEnFoco = null;
    let esInputDoc = false;
    let posicionCursor = 0;

    if (elementoActivo && elementoActivo.tagName === 'INPUT') {
        posicionCursor = elementoActivo.selectionStart || 0;
        if (elementoActivo.classList.contains('input-documento-fiscal')) {
            idTicketEnFoco = parseInt(elementoActivo.getAttribute('data-ticket-id'));
            esInputDoc = true;
        }
    }

    contenedor.innerHTML = '';

    ticketsDeCobro.forEach(t => {
        const consumoTotal = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        const subtotalBase = Math.round((consumoTotal / (1 + TASA_IGV)) * 100) / 100;
        const igv = Math.round((consumoTotal - subtotalBase) * 100) / 100;
        const propinaNum = parseFloat(t.propina) || 0;
        const totalPOS = Math.round((consumoTotal + propinaNum) * 100) / 100;
        const requiereDNI = t.tipoDoc === 'BOLETA' && consumoTotal >= 700;

        const ratioRealTicket = totalConsumoMesa > 0 ? (consumoTotal / totalConsumoMesa) : 0;
        const esFlujoCompartidoDinero = t.esCompartidoPorMonto || !platosDisponibles.some(p => p.idTicketAsignado === t.id);

        let htmlPlatosAsignados = `<div class="jama-ticket-items-list" style="margin-bottom: 12px; border-bottom: 1px dashed var(--lajama-peach); padding-bottom: 8px; max-height: 120px; overflow-y: auto;">`;

        if (esFlujoCompartidoDinero && ratioRealTicket > 0) {
            htmlPlatosAsignados += `<div style="font-size: 0.75rem; font-weight: 800; color: #1B3A2C; margin-bottom: 6px; text-transform: uppercase;">🔄 Parte Proporcional (${Math.round(ratioRealTicket * 100)}%)</div>`;
            const platosCompartidos = platosDisponibles.filter(p => platosSeleccionadosParaCobro.includes(p.id));
            platosCompartidos.sort((a, b) => a.nombre.localeCompare(b.nombre));
            platosCompartidos.forEach(p => {
                const subtotalProrrateado = Math.round(p.subtotal * ratioRealTicket * 100) / 100;
                htmlPlatosAsignados += `
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #4b5563; margin-bottom: 3px;">
                        <span style="max-width: 70%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.cantidad}x ${p.nombre}</span>
                        <span style="font-weight: 600; color: #6b7280;">S/. ${subtotalProrrateado.toFixed(2)}</span>
                    </div>`;
            });
        } else {
            const platosDelTicket = platosDisponibles.filter(p => p.idTicketAsignado === t.id && platosSeleccionadosParaCobro.includes(p.id));
            platosDelTicket.sort((a, b) => a.nombre.localeCompare(b.nombre));
            if (platosDelTicket.length > 0) {
                platosDelTicket.forEach(p => {
                    htmlPlatosAsignados += `
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--jama-text-main); margin-bottom: 4px;">
                            <span style="max-width: 65%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.cantidad}x ${p.nombre}</span>
                            <span style="font-weight: 600;">S/. ${p.subtotal.toFixed(2)}</span>
                        </div>`;
                });
            } else {
                htmlPlatosAsignados += `<div class="text-muted text-center small py-2">Sin ítems asignados</div>`;
            }
        }

        htmlPlatosAsignados += `</div>`;

        contenedor.innerHTML += `
            <div class="jama-ticket-card">
                <div class="jama-ticket-header-badge">TICKET #${t.id + 1}</div>
                <div class="jama-finance-box">
                    ${htmlPlatosAsignados}
                    <div class="jama-finance-line"><span>Subtotal:</span><span>S/. ${subtotalBase.toFixed(2)}</span></div>
                    <div class="jama-finance-line"><span>IGV (18%):</span><span>S/. ${igv.toFixed(2)}</span></div>
                    <div class="jama-finance-line total"><span>Total CPE:</span><span>S/. ${consumoTotal.toFixed(2)}</span></div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="small fw-bold text-info">Propina Extra:</span>
                        <input type="number" class="form-control form-control-sm text-end fw-bold w-50 bg-white text-info border-info"
                               style="border-radius:6px;" value="${propinaNum.toFixed(2)}"
                               onchange="actualizarDatoTicket(${t.id}, 'propina', parseFloat(this.value) || 0)">
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="small fw-bold text-muted">Consumo (SUNAT):</span>
                        <input type="text" class="jama-input-text text-end fw-bold w-50 input-consumo-manual"
                               value="${consumoTotal.toFixed(2)}" data-ticket-id="${t.id}"
                               oninput="this.value = this.value.replace(/[^0-9.]/g, '')"
                               onchange="manoFijarMontoTicket(${t.id}, parseFloat(this.value) || 0)">
                    </div>
                </div>
                <div class="jama-toggle-row">
                    <button class="jama-toggle-btn ${t.tipoDoc === 'BOLETA' ? 'active' : ''}" onclick="actualizarDatoTicket(${t.id}, 'tipoDoc', 'BOLETA')">BOLETA</button>
                    <button class="jama-toggle-btn ${t.tipoDoc === 'FACTURA' ? 'active' : ''}" onclick="actualizarDatoTicket(${t.id}, 'tipoDoc', 'FACTURA')">FACTURA</button>
                </div>
                <div class="mb-3">
                    <input type="text" id="doc_ticket_${t.id}"
                           class="jama-input-text text-center form-control-sm input-documento-fiscal"
                           data-ticket-id="${t.id}"
                           placeholder="${t.tipoDoc === 'FACTURA' ? 'RUC Obligatorio (11 dígitos)' : 'DNI Opcional (8 dígitos)'}"
                           value="${t.numDoc}"
                           oninput="actualizarDatoTicket(${t.id}, 'numDoc', this.value)"
                           maxlength="11">
                    ${requiereDNI ? `<small class="text-danger fw-bold mt-1 d-block text-center" style="font-size:0.7rem; color: #dc3545 !important;">⚠️ DNI Obligatorio >= S/. 700.00</small>` : ''}
                </div>
                <select class="jama-select mb-3" onchange="actualizarDatoTicket(${t.id}, 'metodoPago', this.value)">
                    <option value="EFECTIVO" ${t.metodoPago === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo</option>
                    <option value="POS_TARJETA" ${t.metodoPago === 'POS_TARJETA' ? 'selected' : ''}>💳 POS Tarjeta</option>
                    <option value="YAPE_PLIN" ${t.metodoPago === 'YAPE_PLIN' ? 'selected' : ''}>📱 Yape/Plin</option>
                </select>
                <div class="jama-pos-alert">
                    <span class="small text-muted d-block" style="font-size:0.75rem;">Monto POS:</span>
                    <strong class="text-jama-gold fs-5">S/. ${totalPOS.toFixed(2)}</strong>
                </div>
            </div>`;
    });

    if (esInputDoc && idTicketEnFoco !== null) {
        const inputRestaurado = document.getElementById(`doc_ticket_${idTicketEnFoco}`);
        if (inputRestaurado) {
            inputRestaurado.focus();
            inputRestaurado.setSelectionRange(posicionCursor, posicionCursor);
        }
    }
}

function actualizarDatoTicket(idTicket, llave, valor) {
    if (ticketsDeCobro[idTicket]) {
        if (llave === 'propina') {
            ticketsDeCobro[idTicket][llave] = parseFloat(valor) || 0;
        } else if (llave === 'numDoc') {
            ticketsDeCobro[idTicket][llave] = valor.replace(/[^0-9]/g, '');
        } else {
            ticketsDeCobro[idTicket][llave] = valor;
            if (llave === 'tipoDoc') ticketsDeCobro[idTicket]['numDoc'] = '';
        }
    }
    actualizarVista();
}

function actualizarVista() {
    renderizarPlatos();
    renderizarTickets();

    const contenedorAviso = document.getElementById('cobroIndicacionCliente');
    if (contenedorAviso && ticketsDeCobro.length > 0) {
        const preferenciaActual = ticketsDeCobro[0].tipoDoc;
        if (preferenciaActual === 'FACTURA') {
            contenedorAviso.innerHTML = `
                <div class="d-flex align-items-center gap-2 p-2 rounded-3 animate__animated animate__fadeIn"
                     style="background-color: var(--lajama-skin); color: var(--lajama-green); border: 2px solid var(--lajama-peach); font-weight: 800; font-size: 0.8rem;">
                    <i class="bi bi-building-fill-check fs-5"></i>
                    <span>ALERTA: EL CLIENTE SOLICITA FACTURA</span>
                </div>`;
        } else {
            contenedorAviso.innerHTML = `
                <div class="d-flex align-items-center gap-2 p-2 rounded-3 animate__animated animate__fadeIn"
                     style="background-color: var(--lajama-cream); color: var(--lajama-green); border: 2px solid var(--lajama-peach); font-weight: 700; font-size: 0.8rem;">
                    <i class="bi bi-file-earmark-text-fill fs-5"></i>
                    <span>ALERTA: EL CLIENTE SOLICITA BOLETA</span>
                </div>`;
        }
    }

    const sumaConsumos = ticketsDeCobro.reduce((acc, t) => {
        return acc + Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
    }, 0);

    const desfase = Math.round((totalConsumoMesa - sumaConsumos) * 100) / 100;
    const labelPorAsignar = document.getElementById('txtMontoPorAsignar');
    const btnCierre = document.getElementById('btnLiquidarMesaGlobal');
    const tieneTicketsVacios = ticketsDeCobro.some(t => Math.round((t.montoPlatos + t.montoLibre) * 100) / 100 <= 0);

    if (platosSeleccionadosParaCobro.length === 0) {
        if (labelPorAsignar) {
            labelPorAsignar.innerText = "Marque los platos a cobrar";
            labelPorAsignar.className = "jama-txt-status status-danger";
        }
        if (btnCierre) btnCierre.disabled = true;
    } else if (desfase === 0 && !tieneTicketsVacios) {
        if (labelPorAsignar) {
            labelPorAsignar.innerText = "S/. 0.00 (Cuadrado)";
            labelPorAsignar.className = "jama-txt-status status-success";
        }
        if (btnCierre) btnCierre.disabled = false;
    } else {
        if (labelPorAsignar) {
            if (desfase !== 0) {
                const signo = desfase > 0 ? "Falta" : "Sobra";
                labelPorAsignar.innerText = `${signo} S/. ${Math.abs(desfase).toFixed(2)}`;
            } else {
                labelPorAsignar.innerText = "Hay tickets vacíos en S/. 0.00";
            }
            labelPorAsignar.className = "jama-txt-status status-danger";
        }
        if (btnCierre) btnCierre.disabled = true;
    }

    generarPrevisualizacionCajero();
}

function generarPrevisualizacionCajero() {
    const visor = document.getElementById('visualizador-ticket-cajero');
    if (!visor) return;

    if (ticketsDeCobro.length === 0 || platosSeleccionadosParaCobro.length === 0) {
        visor.innerHTML = "// [TESTING] Esperando selección de platos o inicialización de canastas...";
        return;
    }

    const payloadDePrueba = ticketsDeCobro.map(t => {
        const consumoFinalTicket = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        const ratioRealTicket = totalConsumoMesa > 0 ? (consumoFinalTicket / totalConsumoMesa) : 0;
        const esFlujoCompartidoDinero = t.esCompartidoPorMonto || !platosDisponibles.some(p => p.idTicketAsignado === t.id);
        let listaPlatosModificados = [];

        if (esFlujoCompartidoDinero && ratioRealTicket > 0) {
            listaPlatosModificados = platosDisponibles
                .filter(p => platosSeleccionadosParaCobro.includes(p.id))
                .map(p => {
                    const subtotalProrrateado = Math.round(p.subtotal * ratioRealTicket * 100) / 100;
                    return {
                        productoId: p.productoId || p.id,
                        nombre: p.nombre.trim(),
                        cantidad: p.cantidad,
                        precioUnitarioCalculado: Math.round((subtotalProrrateado / p.cantidad) * 100) / 100,
                        subtotalAsignado: subtotalProrrateado
                    };
                });
        } else {
            listaPlatosModificados = platosDisponibles
                .filter(p => p.idTicketAsignado === t.id && platosSeleccionadosParaCobro.includes(p.id))
                .map(p => ({
                    productoId: p.productoId || p.id,
                    nombre: p.nombre.trim(),
                    cantidad: p.cantidad,
                    precioUnitario: Math.round((p.subtotal / p.cantidad) * 100) / 100,
                    subtotalAsignado: Math.round(p.subtotal * 100) / 100
                }));
        }

        listaPlatosModificados.sort((a, b) => a.nombre.localeCompare(b.nombre));

        return {
            ticketId: t.id + 1,
            tipoDoc: t.tipoDoc,
            metodoPago: t.metodoPago,
            consumoFinalSunat: consumoFinalTicket,
            subtotalNeto: Math.round((consumoFinalTicket / (1 + TASA_IGV)) * 100) / 100,
            igvCalculado: Math.round((consumoFinalTicket - Math.round((consumoFinalTicket / (1 + TASA_IGV)) * 100) / 100) * 100) / 100,
            numItemsEnviados: listaPlatosModificados.length,
            listaDetalles: listaPlatosModificados
        };
    });

    visor.textContent = `// MATRIZ DE COBRO ENVIADA A LA COLA DE FACTURACIÓN\n\n` +
                        JSON.stringify(payloadDePrueba, null, 2);
}