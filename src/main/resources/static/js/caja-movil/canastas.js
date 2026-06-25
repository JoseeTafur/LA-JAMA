// ============================================================================
// CAJA MÓVIL - CANASTAS Y DISTRIBUCIÓN DE SALDOS
// ============================================================================

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
    const estadosPrevios = ticketsDeCobro.map(t => ({ id: t.id, tipoDoc: t.tipoDoc, numDoc: t.numDoc, metodoPago: t.metodoPago }));

    platosDisponibles.forEach(p => p.idTicketAsignado = -1);
    ticketsDeCobro = [];

    for (let i = 0; i < numTickets; i++) {
        const previo = estadosPrevios.find(e => e.id === i);
        ticketsDeCobro.push({
            id: i,
            montoPlatos: 0,
            montoLibre: numTickets === 1 ? totalConsumoMesa : 0,
            propina: 0,
            tipoDoc: previo ? previo.tipoDoc : (i === 0 ? preferenciaComprobante : 'BOLETA'),
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
            t.esCompartidoPorMonto = true;
            t.factorProrrateo = factorParticipacion;
        });

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
                </div>`;
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
                for (let i = 0; i < ticketsDeCobro.length; i++) {
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

function manoFijarMontoTicket(idTicketEditado, valorIngresado) {
    let montoDigitado = Math.round((parseFloat(valorIngresado) || 0) * 100) / 100;
    if (montoDigitado > totalConsumoMesa) {
        montoDigitado = totalConsumoMesa;
        AppUtils.showNotification('El monto no puede superar el total de la mesa.', 'warning');
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
                t.montoLibre = (centimosSobrantes - acumuladoCentimos) / 100;
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
