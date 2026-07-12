let platosSeleccionadosParaCobro = [];
let totalConsumoMesa = 0;
let platosDisponibles = [];
let ticketsDeCobro = [];
const TASA_IGV = 0.18;

// ============================================================================
// CORE CONTABLE: CAJA CENTRALIZADA MULTITICKET (CON PREFERENCIA DE SALÓN)
// ============================================================================

// 🟩 Cambia la cabecera del archivo por esta versión que recibe el documento real:
function inicializarFlujoCaja(montoTotal, numeroMesa, preferenciaComprobante = 'BOLETA', documentoCliente = '') {
    currentMesaNumero = numeroMesa;
    platosSeleccionadosParaCobro = [];
    totalConsumoMesa = 0;
    document.getElementById('cobroNumMesa').innerText = numeroMesa;
    document.getElementById('cobroTotalBase').innerText = totalConsumoMesa.toFixed(2);

    extraerPlatosDelModal();
    configurarSelectorPersonas();

    // 🚀 Pasamos tanto el tipo como el RUC/DNI a la construcción estructural
    reconstruirCanastas(preferenciaComprobante, documentoCliente);
}

// =======================================================
// EXTRAER PLATOS DEL MODAL (BLINDADO HÍBRIDO MOSTRADOR/SALÓN)
// =======================================================
function extraerPlatosDelModal() {
    platosDisponibles = [];
    platosSeleccionadosParaCobro = [];
    let sumaSeleccionados = 0;
    let indexCobro = 0;

    // 🚀 ADUANA 1: Si venimos desde el mostrador de caja con el DTO JSON activo, leemos directo de memoria
    if (typeof datosPedidoActualCaja !== 'undefined' && datosPedidoActualCaja && datosPedidoActualCaja.detalles) {
        console.log("🎯 [La Jama POS] Procesando platos directamente desde el objeto JSON del pedido...");

        datosPedidoActualCaja.detalles.forEach((d) => {
            if (d.canceladoPorCliente || d.pagado) return;

            // Cruzamos con el checkbox real que el cajero marcó o desmarcó en la tabla visual anterior
            const chkCajero = document.querySelector(`.chk-plato-caja-seleccion[value="${d.id}"]`);
            const quiereCobrar = chkCajero ? chkCajero.checked : true;

            if (!quiereCobrar) return;

            let nombrePlato = "Producto";
            if (d.producto && d.producto.nombre) {
                nombrePlato = d.producto.nombre;
            } else if (d.nombreProducto) {
                nombrePlato = d.nombreProducto;
            }

            platosDisponibles.push({
                id: indexCobro,
                productoId: d.producto ? d.producto.id : (d.productoId || d.id),
                nombre: nombrePlato,
                cantidad: d.cantidad || 1,
                subtotal: parseFloat(d.subtotal) || 0,
                idTicketAsignado: -1,
                permitidoCobrar: true
            });

            platosSeleccionadosParaCobro.push(indexCobro);
            sumaSeleccionados += parseFloat(d.subtotal) || 0;
            indexCobro++;
        });

    } else {
        // 🍽️ FALLBACK SALÓN: Si se ejecuta desde el plano de mesas físico, mantiene tu escaneo original
        console.log("🍽️ [La Jama Salón] Ejecutando escaneo físico del DOM de mesas...");
        document.querySelectorAll('#lista-platos-previsualizar > div').forEach((row) => {
            if(row.style.backgroundColor.includes('rgb(255, 229, 229)')) return;

            const estadoPlato = row.getAttribute('data-estado');
            if (estadoPlato !== 'Entregado') return;

            const checkbox = row.querySelector('.chk-mesa-confirmar');
            if (!checkbox || !checkbox.checked) return;

            const badgeCantidad = row.querySelector('.badge.bg-dark');
            let cantidad = 1;
            if (badgeCantidad) {
                cantidad = parseInt(badgeCantidad.innerText.replace('x', '')) || 1;
            }

            const elementoNombre = row.querySelector('.fw-semibold');
            let nombrePlato = elementoNombre ? elementoNombre.innerText : 'Producto';
            nombrePlato = nombrePlato.replace(/^\d+x\s*/, '');

            const elementoPrecio = row.querySelector('.text-muted.small.fw-bold') || row.querySelector('span.small.fw-bold');
            let subtotalPlato = 0;
            if (elementoPrecio) {
                subtotalPlato = parseFloat(elementoPrecio.innerText.replace('S/. ', '')) || 0;
            } else {
                const todosLosSpans = row.querySelectorAll('.d-flex.align-items-center.gap-2 span');
                for (let span of todosLosSpans) {
                    if (span.innerText.includes('S/.')) {
                        subtotalPlato = parseFloat(span.innerText.replace('S/. ', '')) || 0;
                        break;
                    }
                }
            }

            platosDisponibles.push({
                id: indexCobro,
                nombre: nombrePlato,
                cantidad: cantidad,
                subtotal: subtotalPlato,
                idTicketAsignado: -1,
                permitidoCobrar: true
            });

            platosSeleccionadosParaCobro.push(indexCobro);
            sumaSeleccionados += subtotalPlato;
            indexCobro++;
        });
    }

    // Seteamos los totales globales del sistema de caja móvil de manera unificada
    totalConsumoMesa = Math.round(sumaSeleccionados * 100) / 100;

    const txtTotalBase = document.getElementById('cobroTotalBase');
    if (txtTotalBase) {
        txtTotalBase.innerText = totalConsumoMesa.toFixed(2);
    }
}

function configurarSelectorPersonas() {
    const select = document.getElementById('selectNumTickets');
    select.innerHTML = '';

    for (let i = 1; i <= 6; i++) {
        const txt = i === 1 ? '1 Comprobante (Único)' : `${i} Personas / Tickets`;
        select.innerHTML += `<option value="${i}">${txt}</option>`;
    }
    select.disabled = false;
}

function reconstruirCanastas(preferenciaComprobante = 'BOLETA', documentoCliente = '') {
    const numTickets = parseInt(document.getElementById('selectNumTickets').value);

    // Guardamos temporalmente los documentos ya seleccionados para no perder la memoria del clic
    const estadosPrevios = ticketsDeCobro.map(t => ({ id: t.id, tipoDoc: t.tipoDoc, numDoc: t.numDoc, metodoPago: t.metodoPago }));

    platosDisponibles.forEach(p => p.idTicketAsignado = -1);
    ticketsDeCobro = [];

    for (let i = 0; i < numTickets; i++) {
        // Buscamos si ya existía una configuración para esta tarjeta antes del refresco
        const previo = estadosPrevios.find(e => e.id === i);

        ticketsDeCobro.push({
            id: i,
            montoPlatos: 0,
            montoLibre: numTickets === 1 ? totalConsumoMesa : 0,
            propina: 0,
            tipoDoc: previo ? previo.tipoDoc : (i === 0 ? preferenciaComprobante : 'BOLETA'),
            // 🚀 CONTROL INTEGRADO: Si es el Ticket #1 (i === 0) y no hay previo, inyecta el RUC/DNI de salón
            numDoc: previo ? previo.numDoc : (i === 0 ? documentoCliente : ''),
            metodoPago: previo ? previo.metodoPago : 'EFECTIVO'
        });
    }

    const habilitarHerramientas = numTickets > 1;
    document.getElementById('btnDivEquitativa').disabled = !habilitarHerramientas;
    document.getElementById('btnDivPorcentual').disabled = !habilitarHerramientas;
    document.getElementById('selectNumTickets').disabled = false;

    actualizarVista();
}

async function distribuirSaldos(metodo) {
    const totalPlatosAsignados = platosDisponibles
        .filter(p => p.idTicketAsignado !== -1 && platosSeleccionadosParaCobro.includes(p.id))
        .reduce((sum, p) => sum + p.subtotal, 0);

    const saldoSobrante = Math.round((totalConsumoMesa - totalPlatosAsignados) * 100) / 100;

    if (metodo === 'EQUITATIVO') {
        const baseCalculo = saldoSobrante <= 0 ? totalConsumoMesa : saldoSobrante;
        const totalTickets = ticketsDeCobro.length;

        // Factor de división exacto
        const factorParticipacion = 1 / totalTickets;

        let centimosTotales = Math.round(baseCalculo * 100);
        const porcionBaseCentimos = Math.floor(centimosTotales / totalTickets);
        let acumuladoCentimos = 0;

        ticketsDeCobro.forEach((t, idx) => {
            if (idx === totalTickets - 1) {
                t.montoLibre = (centimosTotales - acumuladoCentimos) / 100;
            } else {
                t.montoLibre = porcionBaseCentimos / 100;
                acumuladoCentimos += porcionBaseCentimos;
            }
            t.montoPlatos = 0;

            // Registramos el flag de prorrateo para la aduana de envío
            t.esCompartidoPorMonto = true;
            t.factorProrrateo = factorParticipacion;
        });

        // Dejamos la asignación individual en -1 para activar el diseño visual de cuenta compartida
        platosDisponibles.forEach(p => {
            if (platosSeleccionadosParaCobro.includes(p.id)) p.idTicketAsignado = -1;
        });

        document.getElementById('selectNumTickets').disabled = false;
        actualizarVista();
    }
    else if (metodo === 'PORCENTUAL') {
        const dineroADividir = saldoSobrante <= 0 ? totalConsumoMesa : saldoSobrante;

        let htmlInputs = `<div style="text-align: left; font-size: 0.9rem; color: #6b7280; margin-bottom: 15px;">
                            Sume exactamente 100%. Monto a dividir: <strong style="color: #1B3A2C;">S/. ${dineroADividir.toFixed(2)}</strong>
                          </div>`;

        ticketsDeCobro.forEach((t, i) => {
            htmlInputs += `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
                    <span style="background: #1B3A2C; color: #FFF7ED; padding: 8px 12px; border-radius: 8px; font-weight: 800; font-size: 0.85rem; min-width: 55px; text-align: center;">T-${i+1}</span>
                    <input id="swal-pct-${i}" type="text" class="jama-swal-input" placeholder="0" maxlength="3">
                    <span style="color: #1B3A2C; font-weight: 800;">%</span>
                </div>
            `;
        });

        const { value: formValues } = await Swal.fire({
            title: '<span style="color: #1B3A2C; font-weight: 800; font-size: 1.4rem;">División Porcentual</span>',
            html: htmlInputs,
            background: '#FFF7ED',
            color: '#1f2937',
            confirmButtonColor: '#1B3A2C',
            confirmButtonText: 'Aplicar Porcentajes',
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            cancelButtonColor: '#6b7280',
            target: document.getElementById('modalFacturacion'),
            didOpen: () => {
                ticketsDeCobro.forEach((t, i) => {
                    const inputElement = document.getElementById(`swal-pct-${i}`);
                    if (inputElement) {
                        inputElement.addEventListener('click', function() { this.focus(); });
                        inputElement.addEventListener('input', function() {
                            this.value = this.value.replace(/[^0-9]/g, '');
                        });
                    }
                });
            },
            preConfirm: () => {
                let percentages = [];
                let suma = 0;
                for(let i = 0; i < ticketsDeCobro.length; i++) {
                    const val = parseFloat(document.getElementById(`swal-pct-${i}`).value) || 0;
                    suma += val;
                    percentages.push(val);
                }
                if (suma !== 100) {
                    Swal.showValidationMessage(`Los porcentajes suman ${suma}%. Deben sumar exactamente 100%.`);
                    return false;
                }
                return percentages;
            }
        });

        if (formValues) {
            platosDisponibles.forEach(p => {
                if (platosSeleccionadosParaCobro.includes(p.id)) p.idTicketAsignado = -1;
            });

            let centimosTotales = Math.round(dineroADividir * 100);
            let acumuladoCentimos = 0;
            const totalTickets = ticketsDeCobro.length;

            ticketsDeCobro.forEach((t, idx) => {
                const porcentajeDeseado = formValues[idx];

                t.esCompartidoPorMonto = true;
                t.factorProrrateo = porcentajeDeseado / 100;

                if (idx === totalTickets - 1) {
                    t.montoLibre = (centimosTotales - acumuladoCentimos) / 100;
                } else {
                    const porcionPctCentimos = Math.round(centimosTotales * (porcentajeDeseado / 100));
                    t.montoLibre = porcionPctCentimos / 100;
                    acumuladoCentimos += porcionPctCentimos;
                }
                t.montoPlatos = 0;
            });

            document.getElementById('selectNumTickets').disabled = false;
            actualizarVista();
        }
    }
}

async function preguntarDestinoPlato(platoId) {
    if (!platosSeleccionadosParaCobro.includes(platoId)) return;
    if (ticketsDeCobro.length === 1) return;

    let opciones = { "-1": "Liberar a la mesa" };
    ticketsDeCobro.forEach(t => opciones[t.id] = `Asignar al Ticket #${t.id + 1}`);

    const { value: ticketDestino } = await Swal.fire({
        title: 'Mover Consumo',
        input: 'select',
        inputOptions: opciones,
        background: '#FFF7ED',
        color: '#1f2937',
        confirmButtonColor: '#1b3a2c'
    });

    if (ticketDestino !== undefined) {
        const plato = platosDisponibles.find(p => p.id === platoId);
        plato.idTicketAsignado = parseInt(ticketDestino);

        const hayAsignados = platosDisponibles.some(p => p.idTicketAsignado !== -1);
        document.getElementById('selectNumTickets').disabled = hayAsignados;

        // 🔬 [DEBUG] Rastreo en consola de asignación manual
        console.group(`📌 PLATOS: Asignación Individual`);
        console.log(`🍔 Producto: "${plato.nombre}"`);
        console.log(`🎟️ Destino: ${plato.idTicketAsignado === -1 ? "Liberado a la mesa" : `Ticket #${plato.idTicketAsignado + 1}`}`);
        console.log(`💰 Subtotal: S/. ${plato.subtotal.toFixed(2)}`);
        console.groupEnd();

        recalcularMatriz();
    }
}

function alternarSeleccionPlatoCobro(event, platoId) {
    event.stopPropagation();

    const index = platosSeleccionadosParaCobro.indexOf(platoId);
    if (index === -1) {
        platosSeleccionadosParaCobro.push(platoId);
    } else {
        platosSeleccionadosParaCobro.splice(index, 1);
        const plato = platosDisponibles.find(p => p.id === platoId);
        if (plato) plato.idTicketAsignado = -1;
    }

    recalcularTotalesPorSeleccion();
}

function recalcularTotalesPorSeleccion() {
    let sumaSubtotalesSeleccionados = 0;

    platosDisponibles.forEach(p => {
        if (!platosSeleccionadosParaCobro.includes(p.id)) {
            p.idTicketAsignado = -1;
        } else {
            sumaSubtotalesSeleccionados += p.subtotal;
        }
    });

    totalConsumoMesa = Math.round(sumaSubtotalesSeleccionados * 100) / 100;
    document.getElementById('cobroTotalBase').innerText = totalConsumoMesa.toFixed(2);

    ticketsDeCobro.forEach(t => {
        t.montoPlatos = 0;
        t.montoLibre = ticketsDeCobro.length === 1 ? totalConsumoMesa : 0;
    });

    platosDisponibles.forEach(p => {
        if (p.idTicketAsignado !== -1 && platosSeleccionadosParaCobro.includes(p.id)) {
            ticketsDeCobro[p.idTicketAsignado].montoPlatos += p.subtotal;
        }
    });

    actualizarVista();
}

function recalcularMatriz() {
    ticketsDeCobro.forEach(t => t.montoPlatos = 0);
    platosDisponibles.forEach(p => {
        if (p.idTicketAsignado !== -1 && platosSeleccionadosParaCobro.includes(p.id)) {
            ticketsDeCobro[p.idTicketAsignado].montoPlatos += p.subtotal;
        }
    });
    ticketsDeCobro.forEach(t => t.montoLibre = 0);
    actualizarVista();
}

function renderizarPlatos() {
    const contenedor = document.getElementById('lista-items-repartir');
    contenedor.innerHTML = '';

    platosDisponibles.forEach(p => {
        if (p.idTicketAsignado >= ticketsDeCobro.length) {
            p.idTicketAsignado = -1;
        }

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
                       onclick="alternarSeleccionPlatoCobro(event, ${p.id})">
            `;
        } else {
            checkboxHTML = `
                <input type="checkbox" class="form-check-input text-muted opacity-50" style="margin-right: 8px;" disabled title="Aún en cocina">
            `;
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
            </div>
        `;
    });
}

function renderizarTickets() {
    const contenedor = document.getElementById('contenedor-tickets-dinamicos');
    if (!contenedor) return;

    // 🕵️‍♂️ CAPTURA DE MEMORIA OPERATIVA (Mantiene tu lógica de foco intacta)
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

        // ============================================================================
        // 🛠️ MOTOR DINÁMICO DE PLATOS POR TICKET (CASO 1 Y CASO 2)
        // ============================================================================
        let htmlPlatosAsignados = `<div class="jama-ticket-items-list" style="margin-bottom: 12px; border-bottom: 1px dashed var(--lajama-peach); padding-bottom: 8px; max-height: 120px; overflow-y: auto;">`;

        const ratioRealTicket = totalConsumoMesa > 0 ? (consumoTotal / totalConsumoMesa) : 0;
        const esFlujoCompartidoDinero = t.esCompartidoPorMonto || !platosDisponibles.some(p => p.idTicketAsignado === t.id);

        if (esFlujoCompartidoDinero && ratioRealTicket > 0) {
            // 📊 CASO 2: CUENTA COMPARTIDA (Porcentaje / Mitades)
            htmlPlatosAsignados += `<div style="font-size: 0.75rem; font-weight: 800; color: #1B3A2C; margin-bottom: 6px; text-transform: uppercase;">🔄 Parte Proporcional (${Math.round(ratioRealTicket * 100)}%)</div>`;

            const platosCompartidos = platosDisponibles.filter(p => platosSeleccionadosParaCobro.includes(p.id));
            platosCompartidos.sort((a, b) => a.nombre.localeCompare(b.nombre)); // Orden alfabético

            platosCompartidos.forEach(p => {
                const subtotalProrrateado = Math.round(p.subtotal * ratioRealTicket * 100) / 100;
                htmlPlatosAsignados += `
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #4b5563; margin-bottom: 3px;">
                        <span style="max-width: 70%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.cantidad}x ${p.nombre}</span>
                        <span style="font-weight: 600; color: #6b7280;">S/. ${subtotalProrrateado.toFixed(2)}</span>
                    </div>`;
            });

        } else {
            // 💵 CASO 1: ASIGNACIÓN INDIVIDUAL (Cada uno paga lo suyo)
            const platosDelTicket = platosDisponibles.filter(p => p.idTicketAsignado === t.id && platosSeleccionadosParaCobro.includes(p.id));
            platosDelTicket.sort((a, b) => a.nombre.localeCompare(b.nombre)); // Orden alfabético

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
        // ============================================================================

        // Inyección del HTML final de la tarjeta (Mantiene tus estilos intactos)
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
                    ${requiereDNI ? `<small class="text-danger fw-bold mt-1 d-block text-center animate__animated animate__pulse animate__infinite" style="font-size:0.7rem; color: #dc3545 !important;">⚠️ DNI Obligatorio >= S/. 700.00</small>` : ''}
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

    // RETORNO FOCAL EN CALIENTE (Mantiene tu lógica de foco intacta)
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

            if (llave === 'tipoDoc') {
                ticketsDeCobro[idTicket]['numDoc'] = '';
            }
        }
    }
    actualizarVista();
}

function actualizarVista() {
    renderizarPlatos();
    renderizarTickets();

    const sumaConsumos = ticketsDeCobro.reduce((acc, t) => {
        const totalTicket = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        return acc + totalTicket;
    }, 0);

    const desfase = Math.round((totalConsumoMesa - sumaConsumos) * 100) / 100;
    const labelPorAsignar = document.getElementById('txtMontoPorAsignar');
    const btnCierre = document.getElementById('btnLiquidarMesaGlobal');

    const tieneTicketsVacios = ticketsDeCobro.some(t => {
        const totalTicket = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        return totalTicket <= 0;
    });

    if (platosSeleccionadosParaCobro.length === 0) {
        labelPorAsignar.innerText = "Marque los platos a cobrar";
        labelPorAsignar.className = "jama-txt-status status-danger";
        btnCierre.disabled = true;
    } else if (desfase === 0 && !tieneTicketsVacios) {
        labelPorAsignar.innerText = "S/. 0.00 (Cuadrado)";
        labelPorAsignar.className = "jama-txt-status status-success";
        btnCierre.disabled = false;
    } else {
        if (desfase !== 0) {
            const signo = desfase > 0 ? "Falta" : "Sobra";
            labelPorAsignar.innerText = `${signo} S/. ${Math.abs(desfase).toFixed(2)}`;
        } else {
            labelPorAsignar.innerText = "Hay tickets vacíos en S/. 0.00";
        }
        labelPorAsignar.className = "jama-txt-status status-danger";
        btnCierre.disabled = true;
    }

    generarPrevisualizacionCajero();
}

function limpiarInstanciaCaja() {
    platosSeleccionadosParaCobro = [];
    totalConsumoMesa = 0;
    platosDisponibles = [];
    ticketsDeCobro = [];
}

// ============================================================================
// ADUANA DE CIERRE: EVALUACIÓN FISCAL Y LANZAMIENTO CONTROLADO CON TIMEOUT
// ============================================================================
function procesarLiquidacion() {
    // 🛡️ ADUANA FISCAL DE CONTROL: Evaluamos cada ticket antes de abrir el SweetAlert
    for (let i = 0; i < ticketsDeCobro.length; i++) {
        const t = ticketsDeCobro[i];
        const totalCPE = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        const documento = t.numDoc ? t.numDoc.trim() : '';

        if (t.tipoDoc === 'FACTURA') {
            if (!documento) {
                AppUtils.showNotification(`🚨 Ticket #${i + 1}: El número de RUC es obligatorio para Facturas.`, 'error');
                return;
            }
            if (documento.length !== 11 || !Validation.soloNumeros(documento)) {
                AppUtils.showNotification(`🚨 Ticket #${i + 1}: El RUC comercial debe contener exactamente 11 dígitos numéricos.`, 'error');
                return;
            }
        } else if (t.tipoDoc === 'BOLETA') {
            if (totalCPE >= 700) {
                if (!documento) {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: Por ley SUNAT, montos ≥ S/. 700.00 exigen DNI obligatorio.`, 'error');
                    return;
                }
                if (documento.length !== 8 || !Validation.soloNumeros(documento)) {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: El DNI civil debe contener exactamente 8 dígitos numéricos.`, 'error');
                    return;
                }
            } else {
                if (documento && (documento.length !== 8 || !Validation.soloNumeros(documento))) {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: Si registras un DNI opcional, debe tener 8 dígitos válidos.`, 'error');
                    return;
                }
            }
        }
    }

    // 🚀 GENERACIÓN DEL PAYLOAD: Sincronizado milimétricamente con el DTO de Java
    const payloadTickets = ticketsDeCobro.map(t => {
        const consumoFinalTicket = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        let listaPlatosModificados = [];

        const ratioRealTicket = totalConsumoMesa > 0 ? (consumoFinalTicket / totalConsumoMesa) : 0;
        const esFlujoCompartidoDinero = t.esCompartidoPorMonto || !platosDisponibles.some(p => p.idTicketAsignado === t.id);

        if (esFlujoCompartidoDinero && ratioRealTicket > 0) {
            // 📊 CASO A: CUENTA COMPARTIDA
            listaPlatosModificados = platosDisponibles
                .filter(p => platosSeleccionadosParaCobro.includes(p.id))
                .map(p => {
                    const subtotalProrrateado = Math.round(p.subtotal * ratioRealTicket * 100) / 100;
                    return {
                        productoId: p.id, // ◄ LLAVE CORREGIDA: Coincide con 'detalleDTO.getProductoId()' en Java
                        nombre: p.nombre.trim(),
                        cantidad: p.cantidad,
                        precioUnitario: Math.round((subtotalProrrateado / p.cantidad) * 100) / 100, // ◄ VARIABLE UNIFICADA
                        subtotal: subtotalProrrateado // ◄ VARIABLE UNIFICADA
                    };
                });
        } else {
            // 💵 CASO B: DIVISIÓN POR ÍTEMS INDIVIDUALES
            listaPlatosModificados = platosDisponibles
                .filter(p => p.idTicketAsignado === t.id && platosSeleccionadosParaCobro.includes(p.id))
                .map(p => ({
                    productoId: p.id, // ◄ LLAVE CORREGIDA
                    nombre: p.nombre.trim(),
                    cantidad: p.cantidad,
                    precioUnitario: Math.round((p.subtotal / p.cantidad) * 100) / 100, // ◄ VARIABLE UNIFICADA
                    subtotal: Math.round(p.subtotal * 100) / 100 // ◄ VARIABLE UNIFICADA
                }));
        }

        listaPlatosModificados.sort((a, b) => a.nombre.localeCompare(b.nombre));

        return {
            ticketId: t.id + 1,
            consumoFinal: consumoFinalTicket, // ◄ Mapea directo al 'getConsumoFinal()' del DTO
            propina: t.propina,
            tipoDoc: t.tipoDoc,
            numDoc: t.numDoc || "SIN DOCUMENTO",
            metodoPago: t.metodoPago,
            listaDetalles: listaPlatosModificados
        };
    });

    // 🔬 CONSOLE LOG DE RESPALDO (Por si quieres verlo antes del F5)
    console.log("📦 PAYLOAD SINCRONIZADO ENVIADO A SPRING BOOT:", payloadTickets);

    // ⏳ CONFIGURACIÓN DEL CONTADOR DE SEGURIDAD PSICOLÓGICO (5 SEGUNDOS)
    let segundosRestantes = 5;

    Swal.fire({
        title: '<span style="color: #1B3A2C; font-weight: 800;">¿Confirmar Pago de Consumos?</span>',
        text: `Procesando ${ticketsDeCobro.length} tickets tributarios con IGV de forma segura. Por favor, verifique detalladamente los montos en la pantalla.`,
        icon: 'warning',
        background: '#FFF7ED',
        showCancelButton: true,
        confirmButtonColor: '#1B3A2C',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Esperar (${segundosRestantes}s)`,
        cancelButtonText: 'Cancelar',
        allowOutsideClick: false,
        allowEscapeKey: false,
        target: document.getElementById('modalFacturacion'),

        didOpen: () => {
            const btnConfirmar = Swal.getConfirmButton();
            btnConfirmar.disabled = true;

            const temporizador = setInterval(() => {
                segundosRestantes--;

                if (segundosRestantes > 0) {
                    btnConfirmar.innerText = `Esperar (${segundosRestantes}s)`;
                } else {
                    clearInterval(temporizador);
                    btnConfirmar.disabled = false;
                    btnConfirmar.innerText = 'Sí, Facturar';
                }
            }, 1000);
        }
    }).then((result) => {
        if (result.isConfirmed) {
            ejecutarEnvioBackend(payloadTickets);
        }
    });
}

// 📦 FUNCIÓN ASÍNCRONA AISLADA DE ENVÍO DIRECTO A RESPALDO SERVER (SIN RECARGA FORZADA)
async function ejecutarEnvioBackend(payloadTickets) {
    const btnCierreGlobal = document.getElementById('btnLiquidarMesaGlobal');
    if (btnCierreGlobal) {
        btnCierreGlobal.disabled = true;
        btnCierreGlobal.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando Transacción...`;
    }

    // 🟩 ASINCRONISMO REAL: Escondemos el modal de facturación de inmediato de la vista del usuario
    if (typeof facturacionModal !== 'undefined' && facturacionModal) {
        facturacionModal.hide();
    }
    AppUtils.showLoading(true);

    const urlParams = new URLSearchParams();
    urlParams.append("mesaId", currentMesaId);
    urlParams.append("matrizTickets", JSON.stringify(payloadTickets));

    const idsPagados = Array.from(document.querySelectorAll('.chk-mesa-confirmar:checked')).map(cb => cb.value);
    urlParams.append("idsDetallesPagados", idsPagados.join(','));

    try {
        const res = await fetch(`/admin/mesas/comanda/liquidar-bloque-multiticket/${currentPedidoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlParams
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            limpiarInstanciaCaja();

            // 🚀 EL CAMBIO CLAVE: Cambiamos el window.location.reload() por una limpieza asíncrona fluida
            Swal.fire({
                icon: 'success',
                title: '¡Cobro Procesado!',
                text: 'Los comprobantes fiscales han sido enviados a cola de timbrado de forma segura.',
                confirmButtonColor: '#1B3A2C'
            }).then(() => {
                // Al ser asíncrono, no disparamos F5. El WebSocket refrescará el color del plano en vivo.
                console.log("✔ Transmisión asíncrona completada. Mesa liberada por evento reactivo.");
            });

        } else {
            const txtError = await res.text();
            AppUtils.showNotification(txtError || "Error en la liquidación", "error");

            if (btnCierreGlobal) {
                btnCierreGlobal.disabled = false;
                btnCierreGlobal.innerHTML = `<i class="bi bi-shield-check me-2"></i> Procesar Cierre Masivo`;
            }
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error("Error en liquidación:", error);

        if (btnCierreGlobal) {
            btnCierreGlobal.disabled = false;
            btnCierreGlobal.innerHTML = `<i class="bi bi-shield-check me-2"></i> Procesar Cierre Masivo`;
        }
    }
}
function manoFijarMontoTicket(idTicketEditado, valorIngresado) {
    let montoDigitado = Math.round((parseFloat(valorIngresado) || 0) * 100) / 100;

    if (montoDigitado > totalConsumoMesa) {
        montoDigitado = totalConsumoMesa;
        if (typeof AppUtils !== 'undefined') {
            AppUtils.showNotification('El monto no puede superar el total de la mesa.', 'warning');
        }
    }

    ticketsDeCobro[idTicketEditado].montoLibre = montoDigitado;
    ticketsDeCobro[idTicketEditado].montoPlatos = 0;

    let centimosSobrantes = Math.round((totalConsumoMesa - montoDigitado) * 100);
    const ticketsRestantes = ticketsDeCobro.filter(t => t.id !== idTicketEditado);

    if (ticketsRestantes.length > 0) {
        let acumuladoCentimos = 0;
        const porcionBaseCentimos = Math.floor(centimosSobrantes / ticketsRestantes.length);

        ticketsRestantes.forEach((t, idx) => {
            t.montoPlatos = 0;

            if (idx === ticketsRestantes.length - 1) {
                const saldoFinalCentimos = centimosSobrantes - acumuladoCentimos;
                t.montoLibre = saldoFinalCentimos / 100;
            } else {
                t.montoLibre = porcionBaseCentimos / 100;
                acumuladoCentimos += porcionBaseCentimos;
            }
        });

        platosDisponibles.forEach((p, idx) => {
            if (platosSeleccionadosParaCobro.includes(p.id)) {
                p.idTicketAsignado = idx % ticketsDeCobro.length;
            }
        });
    }

    document.getElementById('selectNumTickets').disabled = true;
    actualizarVista();
}

function removerClienteDePlato(event, platoId) {
    event.stopPropagation();

    const plato = platosDisponibles.find(p => p.id === platoId);
    if (plato) {
        plato.idTicketAsignado = -1;

        const hayAsignados = platosDisponibles.some(p => p.idTicketAsignado !== -1 && platosSeleccionadosParaCobro.includes(p.id));
        document.getElementById('selectNumTickets').disabled = hayAsignados;

        recalcularMatriz();
    }
}

function evaluarBotonConfirmarPago() {
    const btnDesocupar = document.getElementById('btnDesocupar');
    if (!btnDesocupar) return;

    const checksMarcados = document.querySelectorAll('.chk-mesa-confirmar:checked');

    if (checksMarcados.length === 0) {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
        btnDesocupar.style.opacity = "0.5";
        if (typeof recalcularSubtotalElegido === 'function') recalcularSubtotalElegido();
        return;
    }

    let conteoEntregadosMarcados = 0;
    let tienePlatosIncompletosMarcados = false;

    checksMarcados.forEach(checkbox => {
        const estadoLogistico = checkbox.getAttribute('data-estado-plato');

        if (estadoLogistico === 'Entregado') {
            conteoEntregadosMarcados++;
        } else if (estadoLogistico === 'En cocina' || estadoLogistico === 'Listo') {
            tienePlatosIncompletosMarcados = true;
        }
    });

    const sePermiteProcederAlCobro = (conteoEntregadosMarcados > 0 && !tienePlatosIncompletosMarcados);

    if (sePermiteProcederAlCobro) {
        btnDesocupar.classList.remove('disabled');
        btnDesocupar.disabled = false;
        btnDesocupar.style.opacity = "1";
    } else {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
        btnDesocupar.style.opacity = "0.5";
    }

    if (typeof recalcularSubtotalElegido === 'function') {
        recalcularSubtotalElegido();
    }
}

function recalcularSubtotalElegido() {
    const txtElegido = document.getElementById('txt-subtotal-elegido');
    if (!txtElegido) return;

    let sumaAcumulada = 0;

    document.querySelectorAll('.chk-mesa-confirmar:checked').forEach(checkbox => {
        if (checkbox.getAttribute('data-estado-plato') === 'Entregado') {
            const filaPlato = checkbox.closest('.item-plato-comanda');
            if (filaPlato) {
                const precioCrudo = filaPlato.getAttribute('data-precio');
                sumaAcumulada += parseFloat(precioCrudo) || 0;
            }
        }
    });

    txtElegido.innerText = sumaAcumulada.toFixed(2);
}

// ============================================================================
// MOTOR DE TEST: INSPECTOR DE MATRIZ DE TICKETS (DEBUG EN VIVO EN TEXTAREA)
// ============================================================================
function generarPrevisualizacionCajero() {
    const visor = document.getElementById('visualizador-ticket-cajero');
    if (!visor) return;

    if (ticketsDeCobro.length === 0 || platosSeleccionadosParaCobro.length === 0) {
        visor.innerHTML = "// [TESTING] Esperando selección de platos o inicialización de canastas...";
        return;
    }

    const payloadDePrueba = ticketsDeCobro.map(t => {
        const consumoFinalTicket = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        let listaPlatosModificados = [];
        const ratioRealTicket = totalConsumoMesa > 0 ? (consumoFinalTicket / totalConsumoMesa) : 0;
        const esFlujoCompartidoDinero = t.esCompartidoPorMonto || !platosDisponibles.some(p => p.idTicketAsignado === t.id);

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

