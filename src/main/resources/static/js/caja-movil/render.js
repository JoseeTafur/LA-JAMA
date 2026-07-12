// ============================================================================
// CAJA MÓVIL - RENDER DE PLATOS Y TICKETS - render.js
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

        if (p.permitidoCobrar || !p.entregado) {
            const checkedAttr = platosSeleccionadosParaCobro.includes(p.id) ? 'checked' : '';
            checkboxHTML = `
                <input type="checkbox" class="form-check-input chk-cobro-parcial"
                       style="width: 18px; height: 18px; cursor: pointer; border: 2px solid #1B3A2C; margin-right: 8px;"
                       value="${p.id}" ${checkedAttr}
                       onclick="alternarSeleccionPlatoCobro(event, ${p.id})">`;
            estiloFila = ''; // Se mantiene 100% visible y nítido para que el mesero lo controle
        } else {
            // Solo se opaca y bloquea si el plato ya fue entregado y servido al comensal
            checkboxHTML = `<input type="checkbox" class="form-check-input text-muted opacity-50" style="margin-right: 8px;" disabled title="Entregado">`;
            estiloFila = 'opacity: 0.3; background-color: #e5e7eb; cursor: not-allowed; pointer-events: none;';
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
    let esInputCorreo = false;
    let esInputNombre = false; // 🚀 NUEVO: Flag para rastrear el foco del nombre
    let posicionCursor = 0;

    if (elementoActivo && elementoActivo.tagName === 'INPUT') {
        posicionCursor = elementoActivo.selectionStart || 0;
        if (elementoActivo.classList.contains('input-documento-fiscal')) {
            idTicketEnFoco = parseInt(elementoActivo.getAttribute('data-ticket-id'));
            esInputDoc = true;
        }
        else if (elementoActivo.classList.contains('input-correo-fiscal')) {
            idTicketEnFoco = parseInt(elementoActivo.getAttribute('data-ticket-id'));
            esInputCorreo = true;
        }
        // 🚀 NUEVO: Captura si el cajero está editando manualmente el nombre del cliente
        else if (elementoActivo.classList.contains('input-nombre-fiscal')) {
            idTicketEnFoco = parseInt(elementoActivo.getAttribute('data-ticket-id'));
            esInputNombre = true;
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
                           value="${t.numDoc || ''}"
                           oninput="evaluarDisparoConsultaFiscal(${t.id}, this)"
                           maxlength="11">
                    ${requiereDNI ? `<small class="text-danger fw-bold mt-1 d-block text-center" style="font-size:0.7rem; color: #dc3545 !important;">⚠️ DNI Obligatorio >= S/. 700.00</small>` : ''}

                    <div id="status_doc_${t.id}" class="mt-1 text-center fw-bold small" style="font-size: 0.75rem;">
                        ${t.docStatus === 'OK' ? '<span class="text-success">✅ Documento verificado lícitamente</span>' : ''}
                        ${t.docStatus === 'ERROR' ? '<span class="text-danger">❌ Documento no válido o inexistente</span>' : ''}
                    </div>
                </div>

                <div class="mb-3">
                    <input type="text" id="nombre_ticket_${t.id}"
                           class="jama-input-text text-center form-control-sm input-nombre-fiscal"
                           data-ticket-id="${t.id}"
                           placeholder="👤 Nombre / Razón Social"
                           value="${t.nombreCliente || ''}"
                           ${t.docStatus === 'OK' ? 'readonly style="background-color: #f3f4f6; color: #1b3a2c; font-weight: 700; border: 1px solid #1b3a2c;"' : ''}
                           oninput="window.guardarNombreManualEnMemoria(${t.id}, this.value)">
                </div>

                <div class="mb-3">
                    <input type="text" inputmode="email" id="correo_ticket_${t.id}"
                           class="jama-input-text text-center form-control-sm input-correo-fiscal"
                           data-ticket-id="${t.id}"
                           placeholder="📧 Correo Comprobante (Opcional)"
                           value="${t.clienteCorreo || ''}"
                           oninput="actualizarDatoTicket(${t.id}, 'clienteCorreo', this.value)">
                </div>

                <select class="jama-select mb-3" onchange="actualizarDatoTicket(${t.id}, 'metodoPago', this.value)">
                    <option value="EFECTIVO" ${t.metodoPago === 'EFECTIVO' ? 'selected' : ''}>💵 Efectivo</option>
                    <option value="POS_TARJETA" ${t.metodoPago === 'POS_TARJETA' ? 'selected' : ''}>💳 POS Tarjeta</option>
                    <option value="YAPE" ${t.metodoPago === 'YAPE' ? 'selected' : ''}>📱 Yape</option>
                    <option value="PLIN" ${t.metodoPago === 'PLIN' ? 'selected' : ''}>📱 Plin</option>
                </select>
                <div class="jama-pos-alert">
                    <span class="small text-muted d-block" style="font-size:0.75rem;">Monto POS:</span>
                    <strong class="text-jama-gold fs-5">S/. ${totalPOS.toFixed(2)}</strong>
                </div>
            </div>`;
    });

    // ─── RESTAURACIÓN COHESIVA DEL FOCO ───
    if (esInputDoc && idTicketEnFoco !== null) {
            const inputRestaurado = document.getElementById(`doc_ticket_${idTicketEnFoco}`);
            if (inputRestaurado) { inputRestaurado.focus(); inputRestaurado.setSelectionRange(posicionCursor, posicionCursor); }
        }
        else if (esInputCorreo && idTicketEnFoco !== null) {
            const correoRestaurado = document.getElementById(`correo_ticket_${idTicketEnFoco}`);
            if (correoRestaurado) {
                correoRestaurado.focus();
                // 🛡️ ESCUDO: Evitamos usar setSelectionRange en inputs tipo email/number para que no explote
                if (correoRestaurado.type === 'text' || correoRestaurado.setSelectionRange && typeof correoRestaurado.select === 'function') {
                    try { correoRestaurado.setSelectionRange(posicionCursor, posicionCursor); } catch(e) { console.warn(e); }
                } else {
                    // Fallback seguro: Mueve el cursor al final del texto de forma natural
                    const longitudTexto = correoRestaurado.value.length;
                    try { correoRestaurado.setSelectionRange(longitudTexto, longitudTexto); } catch(e) { /* Failsafe total */ }
                }
            }
        }
        else if (esInputNombre && idTicketEnFoco !== null) {
            const nombreRestaurado = document.getElementById(`nombre_ticket_${idTicketEnFoco}`);
            if (nombreRestaurado) { nombreRestaurado.focus(); nombreRestaurado.setSelectionRange(posicionCursor, posicionCursor); }
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


/**
 * ⚡ DETECTOR DE COINCIDENCIA NUMÉRICA PARA DOCUMENTOS
 * Evalúa en tiempo real si se completaron los dígitos reglamentarios para gatillar el fetch.
 */
function evaluarDisparoConsultaFiscal(idTicket, inputElement) {
    let valor = inputElement.value.replace(/[^0-9]/g, '');
    inputElement.value = valor;

    ticketsDeCobro[idTicket].numDoc = valor;
    const tipoDoc = ticketsDeCobro[idTicket].tipoDoc;

    // 🎯 ESCUDO DE LIBERACIÓN: Si altera la cantidad reglamentaria o borra, se quita el candado
    if ((tipoDoc === 'BOLETA' && valor.length !== 8) || (tipoDoc === 'FACTURA' && valor.length !== 11)) {
        ticketsDeCobro[idTicket].docStatus = null;
        ticketsDeCobro[idTicket].nombreCliente = '';

        const inputNombre = document.getElementById(`nombre_ticket_${idTicket}`);
        if (inputNombre) {
            inputNombre.value = '';
            inputNombre.removeAttribute('readonly');
            inputNombre.style.backgroundColor = '';
            inputNombre.style.color = '';
            inputNombre.style.border = '';
            inputNombre.placeholder = "👤 Nombre / Razón Social";
        }
        const statusDiv = document.getElementById(`status_doc_${idTicket}`);
        if (statusDiv) statusDiv.innerHTML = '';

        // Refrescamos métricas del botón sin reventar el foco
        generarPrevisualizacionCajero();
        return;
    }

    // 🎯 GATILLO OFICIAL AUTOMÁTICO
    if ((tipoDoc === 'BOLETA' && valor.length === 8) || (tipoDoc === 'FACTURA' && valor.length === 11)) {
        ejecutarConsultaDocumentoOficial(idTicket, tipoDoc === 'FACTURA' ? 'ruc' : 'dni', valor);
    }
}

/**
 * 📡 CONSUMIDOR ASÍNCRONO DE DOCUMENTOCONTROLLER (LA JAMA SHIELD)
 * Conecta con tu backend para traer los datos oficiales y gestionar las aduanas de error.
 */
function ejecutarConsultaDocumentoOficial(idTicket, tipoEndpoint, numeroDocumento) {
    const statusDiv = document.getElementById(`status_doc_${idTicket}`);
    const inputNombre = document.getElementById(`nombre_ticket_${idTicket}`);

    if (statusDiv) statusDiv.innerHTML = '<span class="text-muted"><i class="spinner-border spinner-border-sm"></i> Consultando padrón...</span>';

    fetch(`/api/documentos/${tipoEndpoint}/${numeroDocumento}`)
        .then(res => {
            if (!res.ok) throw new Error("ERROR_CONEXION");
            return res.json();
        })
        .then(data => {
            // 📊 RADAR DE CONTROL DE IDENTIDAD EN CALIENTE
            console.log("🎯 [MIAPI.CLOUD RESPUESTA REAL CRUDA]:", data);

            // 🚀 NUEVA EXTRACCIÓN SOPORTE MIAPI.CLOUD (Estructura con data.datos)
            let nombreCompleto = null;

            if (data.success && data.datos) {
                const d = data.datos;
                const apePaterno = d.ape_paterno || d.apellidoPaterno || '';
                const apeMaterno = d.ape_materno || d.apellidoMaterno || '';
                nombreCompleto = `${d.nombres || ''} ${apePaterno} ${apeMaterno}`.trim();
            } else {
                // Fallback por si la estructura original de otros endpoints se mantiene
                nombreCompleto = data.nombre || data.razonSocial || data.nombreCompleto ||
                                 (data.data && data.data.nombre_completo ? data.data.nombre_completo : null) ||
                                 data.nombre_completo ||
                                 (data.nombres ? `${data.nombres} ${data.apellidoPaterno || ''}` : null);
            }

            // Si después de mapear todo sigue vacío, lanzamos el error de padrón
            if (!nombreCompleto || data.error) {
                throw new Error("NOT_FOUND");
            }

            // 🟢 ESCENARIO A: DOCUMENTO ENCONTRADO Y CORRECTO
            ticketsDeCobro[idTicket].docStatus = 'OK';
            ticketsDeCobro[idTicket].nombreCliente = nombreCompleto.toUpperCase();

            // Refrescamos en caliente la UI sin perder el cursor del cajero
            if (inputNombre) inputNombre.value = ticketsDeCobro[idTicket].nombreCliente;
            if (statusDiv) statusDiv.innerHTML = '<span class="text-success">✅ Documento verificado lícitamente</span>';

            AppUtils.showNotification("Identidad fiscal cargada con éxito", "success");
            actualizarVista();
        })
        .catch(err => {
            // 🔴 ESCENARIO B: DOCUMENTO INCORRECTO / INEXISTENTE
            ticketsDeCobro[idTicket].docStatus = 'ERROR';
            ticketsDeCobro[idTicket].nombreCliente = ''; // Se limpia el nombre para forzar que sea corregido

            if (inputNombre) {
                inputNombre.value = '';
                inputNombre.placeholder = "❌ Ingrese nombre manualmente";
            }

            if (statusDiv) statusDiv.innerHTML = '<span class="text-danger">❌ Documento no válido o inexistente</span>';

            AppUtils.showNotification(
                err.message === "NOT_FOUND"
                    ? "El número ingresado no existe en el padrón nacional."
                    : "No se pudo conectar con el servidor de identidades.",
                "error"
            );
        });
}

window.guardarNombreManualEnMemoria = function(ticketId, valorTexto) {
    if (ticketsDeCobro && ticketsDeCobro[ticketId]) {
        ticketsDeCobro[ticketId].nombreCliente = valorTexto.toUpperCase();
    }
};
window.evaluarDisparoConsultaFiscal = evaluarDisparoConsultaFiscal;