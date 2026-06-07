let platosSeleccionadosParaCobro = [];
let totalConsumoMesa = 0;
let platosDisponibles = [];
let ticketsDeCobro = [];
const TASA_IGV = 0.18;

function inicializarFlujoCaja(montoTotal, numeroMesa) {
    currentMesaNumero = numeroMesa;
    platosSeleccionadosParaCobro = [];
    totalConsumoMesa = 0;
    document.getElementById('cobroNumMesa').innerText = numeroMesa;
    document.getElementById('cobroTotalBase').innerText = totalConsumoMesa.toFixed(2);

    extraerPlatosDelModal();
    configurarSelectorPersonas();
    reconstruirCanastas();
}

// =======================================================
// EXTRAER PLATOS DEL MODAL (CORREGIDO Y BLINDADO)
// =======================================================
function extraerPlatosDelModal() {
    platosDisponibles = [];
    platosSeleccionadosParaCobro = [];
    let sumaSeleccionados = 0;
    let indexCobro = 0;

    // Buscamos todas las filas de platos en el modal de gestión operativa
    document.querySelectorAll('#lista-platos-previsualizar > div').forEach((row) => {
        // 1. Ignoramos mermas / anulados
        if(row.style.backgroundColor.includes('rgb(255, 229, 229)')) return;

        // 2. FILTRO LOGÍSTICO EXTREMO: Si el plato NO está "Entregado", la caja lo ignora por completo
        const estadoPlato = row.getAttribute('data-estado');
        if (estadoPlato !== 'Entregado') return;

        // 3. Buscamos el checkbox específico
        const checkbox = row.querySelector('.chk-mesa-confirmar');
        if (!checkbox || !checkbox.checked) return;

        // Extraemos la cantidad buscando el badge oscuro (ej: "1x", "2x")
        const badgeCantidad = row.querySelector('.badge.bg-dark');
        let cantidad = 1;
        if (badgeCantidad) {
            cantidad = parseInt(badgeCantidad.innerText.replace('x', '')) || 1;
        }

        // Extraemos el nombre del plato limpiando cualquier prefijo residual
        const elementoNombre = row.querySelector('.fw-semibold');
        let nombrePlato = elementoNombre ? elementoNombre.innerText : 'Producto';
        nombrePlato = nombrePlato.replace(/^\d+x\s*/, '');

        // Extraemos el subtotal buscando el texto que tiene el formato "S/. 00.00"
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

        // Estructuramos el objeto para la división de tickets
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

    // Seteamos los totales globales del sistema de caja móvil
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

function reconstruirCanastas() {
    const numTickets = parseInt(document.getElementById('selectNumTickets').value);

    platosDisponibles.forEach(p => p.idTicketAsignado = -1);
    ticketsDeCobro = [];

    for (let i = 0; i < numTickets; i++) {
        ticketsDeCobro.push({
            id: i,
            montoPlatos: 0,
            montoLibre: numTickets === 1 ? totalConsumoMesa : 0,
            propina: 0,
            tipoDoc: 'BOLETA',
            numDoc: '',
            metodoPago: 'EFECTIVO'
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

        let tIndex = 0;
        platosDisponibles.forEach(p => {
            if (p.idTicketAsignado === -1 && platosSeleccionadosParaCobro.includes(p.id)) {
                p.idTicketAsignado = tIndex % ticketsDeCobro.length;
                tIndex++;
            }
        });

        let centimosTotales = Math.round(baseCalculo * 100);
        const totalTickets = ticketsDeCobro.length;
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
            let tIndex = 0;
            platosDisponibles.forEach(p => {
                if (p.idTicketAsignado === -1 && platosSeleccionadosParaCobro.includes(p.id)) {
                    p.idTicketAsignado = tIndex % ticketsDeCobro.length;
                    tIndex++;
                }
            });

            let centimosTotales = Math.round(dineroADividir * 100);
            let acumuladoCentimos = 0;
            const totalTickets = ticketsDeCobro.length;

            ticketsDeCobro.forEach((t, idx) => {
                if (idx === totalTickets - 1) {
                    t.montoLibre = (centimosTotales - acumuladoCentimos) / 100;
                } else {
                    const porcionPctCentimos = Math.round(centimosTotales * (formValues[idx] / 100));
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
    contenedor.innerHTML = '';

    ticketsDeCobro.forEach(t => {
        const consumoTotal = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;

        const subtotalBase = Math.round((consumoTotal / (1 + TASA_IGV)) * 100) / 100;
        const igv = Math.round((consumoTotal - subtotalBase) * 100) / 100;

        const propinaNum = parseFloat(t.propina) || 0;
        const totalPOS = Math.round((consumoTotal + propinaNum) * 100) / 100;
        const requiereDNI = t.tipoDoc === 'BOLETA' && consumoTotal >= 700;

        const platosDelTicket = platosDisponibles.filter(p => p.idTicketAsignado === t.id && platosSeleccionadosParaCobro.includes(p.id));
        let htmlPlatosAsignados = '';

        if (t.montoLibre > 0) {
            const totalTickets = ticketsDeCobro.length;
            const porcentajeParticipacion = totalConsumoMesa > 0 ? Math.round((consumoTotal / totalConsumoMesa) * 100) : 0;

            const esEquitativo = ticketsDeCobro.every(tick =>
                Math.abs((tick.montoPlatos + tick.montoLibre) - consumoTotal) < 0.05
            );

            const textoParticipacion = esEquitativo
                ? `1/${totalTickets} de la mesa`
                : `${porcentajeParticipacion}% de la mesa`;

            htmlPlatosAsignados = `
                <div class="jama-ticket-items-list" style="margin-bottom: 15px; border-bottom: 2px dashed var(--lajama-peach); padding-bottom: 12px;">
                    <div style="font-size: 0.85rem; font-weight: 800; color: var(--lajama-green); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                        🔄 Cuenta Compartida
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--jama-text-muted); margin-bottom: 4px;">
                        <span>Total Parcial:</span>
                        <span style="font-weight: 600;">S/. ${totalConsumoMesa.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--jama-text-muted); margin-bottom: 4px;">
                        <span>Participación:</span>
                        <span style="font-weight: 700; color: var(--lajama-green);">${textoParticipacion}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--jama-text-main); margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(27, 58, 44, 0.1);">
                        <span class="fw-semibold">Monto Consumo:</span>
                        <span style="font-weight: 800; color: var(--lajama-green);">S/. ${consumoTotal.toFixed(2)}</span>
                    </div>
                </div>
            `;
        } else if (platosDelTicket.length > 0) {
            htmlPlatosAsignados = `<div class="jama-ticket-items-list" style="margin-bottom: 12px; border-bottom: 1px dashed var(--lajama-peach); padding-bottom: 8px;">`;
            platosDelTicket.forEach(p => {
                htmlPlatosAsignados += `
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--jama-text-main); margin-bottom: 4px;">
                        <span style="max-width: 70%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${p.cantidad}x ${p.nombre}</span>
                        <span style="font-weight: 600;">S/. ${p.subtotal.toFixed(2)}</span>
                    </div>
                `;
            });
            htmlPlatosAsignados += `</div>`;
        } else {
            htmlPlatosAsignados = `
                <div class="jama-ticket-items-list" style="margin-bottom: 12px; border-bottom: 1px dashed var(--lajama-peach); padding-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--jama-text-main);">
                        <span>1x Consumo de Alimentos</span>
                        <span style="font-weight: 600;">S/. ${consumoTotal.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }

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
                               style="border-radius:6px;"
                               value="${propinaNum.toFixed(2)}"
                               onchange="actualizarDatoTicket(${t.id}, 'propina', parseFloat(this.value) || 0)">
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="small fw-bold text-muted">Consumo (SUNAT):</span>
                        <input type="text" class="jama-input-text text-end fw-bold w-50 input-consumo-manual"
                               value="${consumoTotal.toFixed(2)}"
                               data-ticket-id="${t.id}"
                               oninput="this.value = this.value.replace(/[^0-9.]/g, '')"
                               onchange="manoFijarMontoTicket(${t.id}, parseFloat(this.value) || 0)">
                    </div>
                </div>

                <div class="jama-toggle-row">
                    <button class="jama-toggle-btn ${t.tipoDoc === 'BOLETA' ? 'active' : ''}" onclick="actualizarDatoTicket(${t.id}, 'tipoDoc', 'BOLETA')">BOLETA</button>
                    <button class="jama-toggle-btn ${t.tipoDoc === 'FACTURA' ? 'active' : ''}" onclick="actualizarDatoTicket(${t.id}, 'tipoDoc', 'FACTURA')">FACTURA</button>
                </div>

                <div class="mb-3">
                    <input type="text" class="jama-input-text text-center form-control-sm" placeholder="${t.tipoDoc === 'FACTURA' ? 'RUC Obligatorio' : 'DNI Opcional'}" value="${t.numDoc}" oninput="actualizarDatoTicket(${t.id}, 'numDoc', this.value)" maxlength="11">
                    ${requiereDNI ? `<small class="text-danger fw-bold mt-1 d-block text-center" style="font-size:0.7rem;">DNI Obligatorio >= S/. 700</small>` : ''}
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
            </div>
        `;
    });
}

function actualizarDatoTicket(idTicket, llave, valor) {
    if (llave === 'propina') {
        ticketsDeCobro[idTicket][llave] = parseFloat(valor) || 0;
    } else if (llave === 'numDoc') {
        ticketsDeCobro[idTicket][llave] = valor.replace(/[^0-9]/g, '');
    } else {
        ticketsDeCobro[idTicket][llave] = valor;
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
}

function limpiarInstanciaCaja() {
    platosSeleccionadosParaCobro = [];
    totalConsumoMesa = 0;
    platosDisponibles = [];
    ticketsDeCobro = [];
}

function procesarLiquidacion() {
    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Pago de Consumos?',
        text: `Procesando ${ticketsDeCobro.length} tickets tributarios con IGV.`,
        icon: 'warning',
        confirmButtonColor: '#ffc107',
        confirmButtonText: 'Sí, Facturar'
    }, async function() {
        if (facturacionModal) facturacionModal.hide();
        AppUtils.showLoading(true);

        const urlParams = new URLSearchParams();
        urlParams.append("mesaId", currentMesaId);

        const payloadTickets = ticketsDeCobro.map(t => ({
            ...t,
            consumoFinal: Math.round((t.montoPlatos + t.montoLibre) * 100) / 100
        }));
        urlParams.append("matrizTickets", JSON.stringify(payloadTickets));

        // 🌟 NUEVO: Recolectar los IDs reales de los platos marcados en el modal principal y enviarlos al Java
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
                Swal.fire({
                    icon: 'success',
                    title: '¡Cobro Procesado!',
                    confirmButtonColor: '#1B3A2C'
                }).then(() => window.location.reload());
            } else {
                const txtError = await res.text();
                AppUtils.showNotification(txtError || "Error en la liquidación", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error en liquidación:", error);
            window.location.reload();
        }
    });
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

// =================================================================
// EVALUACIÓN DINÁMICA DE CONFIRMACIÓN DE PAGO (EXCLUSIVIDAD TOTAL)
// =================================================================
function evaluarBotonConfirmarPago() {
    const btnDesocupar = document.getElementById('btnDesocupar');
    if (!btnDesocupar) return;

    // 1. Capturamos todos los checkboxes seleccionados por el mesero en el modal
    const checksMarcados = document.querySelectorAll('.chk-mesa-confirmar:checked');

    // Si no hay nada seleccionado, el botón de pago se apaga por defecto
    if (checksMarcados.length === 0) {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
        btnDesocupar.style.opacity = "0.5";
        if (typeof recalcularSubtotalElegido === 'function') recalcularSubtotalElegido();
        return;
    }

    let conteoEntregadosMarcados = 0;
    let tienePlatosIncompletosMarcados = false; // 🚨 NUEVA BANDERA DE CONTROL

    // 2. Analizamos rigurosamente cada uno de los elementos marcados
    checksMarcados.forEach(checkbox => {
        const estadoLogistico = checkbox.getAttribute('data-estado-plato');

        if (estadoLogistico === 'Entregado') {
            conteoEntregadosMarcados++;
        } else if (estadoLogistico === 'En cocina' || estadoLogistico === 'Listo') {
            // 🚨 SI ENCUENTRA ENTRUSOS: Encendemos la alarma de bloqueo inmediatamente
            tienePlatosIncompletosMarcados = true;
        }
    });

    // 3. REGLA DE EXCLUSIVIDAD DE NUESTRA APP:
    // El botón SOLO se prende si hay mínimo un entregado Y CERO platos incompletos en la selección.
    const sePermiteProcederAlCobro = (conteoEntregadosMarcados > 0 && !tienePlatosIncompletosMarcados);

    if (sePermiteProcederAlCobro) {
        btnDesocupar.classList.remove('disabled');
        btnDesocupar.disabled = false;
        btnDesocupar.style.opacity = "1";
    } else {
        // Bloquea si solo hay cocina, o si hay una mezcla de entregado + cocina
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
        btnDesocupar.style.opacity = "0.5";
    }

    // 4. Actualizamos el subtotal reflejado en la interfaz de usuario
    if (typeof recalcularSubtotalElegido === 'function') {
        recalcularSubtotalElegido();
    }
}

// =======================================================
// RECALCULAR EL MONTO CONSOLIDADO (UNIFICADO EN CAJA-MOVIL)
// =======================================================
function recalcularSubtotalElegido() {
    const txtElegido = document.getElementById('txt-subtotal-elegido');
    if (!txtElegido) return;

    let sumaAcumulada = 0;

    // Buscamos todos los checkboxes seleccionados en el modal principal
    document.querySelectorAll('.chk-mesa-confirmar:checked').forEach(checkbox => {
        // 🚨 REGLA LOGÍSTICA: Solo sumamos al dinero de la precuenta si el plato ya fue servido.
        // Si el plato está "En cocina" o "Listo", el checkbox se mantiene seleccionado para mudanzas,
        // pero su precio NO suma a la precuenta del cobro actual.
        if (checkbox.getAttribute('data-estado-plato') === 'Entregado') {
            const filaPlato = checkbox.closest('.item-plato-comanda');
            if (filaPlato) {
                const precioCrudo = filaPlato.getAttribute('data-precio');
                sumaAcumulada += parseFloat(precioCrudo) || 0;
            }
        }
    });

    // Inyectamos el total formateado de manera limpia con dos decimales
    txtElegido.innerText = sumaAcumulada.toFixed(2);
}