// ============================================================================
// CAJA MÓVIL - LIQUIDACIÓN Y ENVÍO AL BACKEND
// ============================================================================

function procesarLiquidacion() {
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

    const payloadTickets = ticketsDeCobro.map(t => {
        const consumoFinalTicket = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        const ratioRealTicket = totalConsumoMesa > 0 ? (consumoFinalTicket / totalConsumoMesa) : 0;
        const esFlujoCompartidoDinero = t.esCompartidoPorMonto || !platosDisponibles.some(p => p.idTicketAsignado === t.id);
        let listaPlatosModificados = [];

        if (esFlujoCompartidoDinero && ratioRealTicket > 0) {
            // 📊 Caso A: Cuenta Compartida Proporcional
            listaPlatosModificados = platosDisponibles
                .filter(p => platosSeleccionadosParaCobro.includes(p.id))
                .map(p => {
                    const subtotalProrrateado = Math.round(p.subtotal * ratioRealTicket * 100) / 100;
                    return {
                        productoId: p.productoId || p.id, // ◄ LLAVE INTEGRAL RECUPERADA (No colapsa el id del loop)
                        nombre: p.nombre.trim(),
                        cantidad: p.cantidad,
                        precioUnitario: Math.round((subtotalProrrateado / p.cantidad) * 100) / 100,
                        subtotal: subtotalProrrateado
                    };
                });
        } else {
            // 💵 Caso B: División por Ítems Individuales
            listaPlatosModificados = platosDisponibles
                .filter(p => p.idTicketAsignado === t.id && platosSeleccionadosParaCobro.includes(p.id))
                .map(p => ({
                    productoId: p.productoId || p.id, // ◄ LLAVE INTEGRAL RECUPERADA
                    nombre: p.nombre.trim(),
                    cantidad: p.cantidad,
                    precioUnitario: Math.round((p.subtotal / p.cantidad) * 100) / 100,
                    subtotal: Math.round(p.subtotal * 100) / 100
                }));
        }

        listaPlatosModificados.sort((a, b) => a.nombre.localeCompare(b.nombre));

        return {
            ticketId: t.id + 1,
            consumoFinal: consumoFinalTicket,
            propina: t.propina,
            tipoDoc: t.tipoDoc,
            numDoc: t.numDoc || "SIN DOCUMENTO",
            metodoPago: t.metodoPago,
            listaDetalles: listaPlatosModificados
        };
    });

    console.log("📦 PAYLOAD SINCRONIZADO ENVIADO A SPRING BOOT:", payloadTickets);

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
        if (result.isConfirmed) ejecutarEnvioBackend(payloadTickets);
    });
}

async function ejecutarEnvioBackend(payloadTickets) {
    const btnCierreGlobal = document.getElementById('btnLiquidarMesaGlobal');
    if (btnCierreGlobal) {
        btnCierreGlobal.disabled = true;
        btnCierreGlobal.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Procesando Transacción...`;
    }

    if (typeof facturacionModal !== 'undefined' && facturacionModal) facturacionModal.hide();
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

            if (typeof cargarLiquidadosTurnoAsincrono === 'function') {
                            cargarLiquidadosTurnoAsincrono();
            }

            Swal.fire({
                icon: 'success',
                title: '¡Cobro Procesado!',
                text: 'Los comprobantes fiscales han sido enviados a cola de timbrado de forma segura.',
                confirmButtonColor: '#1B3A2C'
            }).then(() => {
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

    const sePermite = (conteoEntregadosMarcados > 0 && !tienePlatosIncompletosMarcados);
    btnDesocupar.classList.toggle('disabled', !sePermite);
    btnDesocupar.disabled = !sePermite;
    btnDesocupar.style.opacity = sePermite ? "1" : "0.5";

    if (typeof recalcularSubtotalElegido === 'function') recalcularSubtotalElegido();
}

function recalcularSubtotalElegido() {
    const txtElegido = document.getElementById('txt-subtotal-elegido');
    if (!txtElegido) return;

    let sumaAcumulada = 0;
    document.querySelectorAll('.chk-mesa-confirmar:checked').forEach(checkbox => {
        if (checkbox.getAttribute('data-estado-plato') === 'Entregado') {
            const filaPlato = checkbox.closest('.item-plato-comanda');
            if (filaPlato) sumaAcumulada += parseFloat(filaPlato.getAttribute('data-precio')) || 0;
        }
    });

    txtElegido.innerText = sumaAcumulada.toFixed(2);
}