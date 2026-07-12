// ============================================================================
// CAJA MÓVIL - LIQUIDACIÓN Y ENVÍO AL BACKEND - liquidacion.js
// ============================================================================

function procesarLiquidacion() {
    for (let i = 0; i < ticketsDeCobro.length; i++) {
        const t = ticketsDeCobro[i];
        const totalCPE = Math.round((t.montoPlatos + t.montoLibre) * 100) / 100;
        const documento = t.numDoc ? t.numDoc.trim() : '';
        const nombreCliente = t.nombreCliente ? t.nombreCliente.trim() : '';

        if (t.tipoDoc === 'FACTURA') {
            // 🔒 Candados estrictos para RUC
            if (!documento) {
                AppUtils.showNotification(`🚨 Ticket #${i + 1}: El número de RUC es obligatorio para Facturas comercial.`, 'error');
                return;
            }
            if (documento.length !== 11) {
                AppUtils.showNotification(`🚨 Ticket #${i + 1}: El RUC debe contener exactamente 11 dígitos.`, 'error');
                return;
            }
            if (t.docStatus !== 'OK') {
                AppUtils.showNotification(`🚨 Ticket #${i + 1}: Debes ingresar un número de RUC válido y verificado en la consulta oficial de Sunat.`, 'error');
                return;
            }
            if (!nombreCliente) {
                AppUtils.showNotification(`🚨 Ticket #${i + 1}: Razón Social no puede estar vacía para procesar la Factura.`, 'error');
                return;
            }
        } else if (t.tipoDoc === 'BOLETA') {
            // 🔒 Candados estrictos para Boletas
            if (totalCPE >= 700) {
                if (!documento) {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: Por ley SUNAT, montos ≥ S/. 700.00 exigen DNI obligatorio de forma lícita.`, 'error');
                    return;
                }
                if (documento.length !== 8) {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: El DNI debe contener exactamente 8 dígitos.`, 'error');
                    return;
                }
                if (t.docStatus !== 'OK') {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: El DNI ingresado no pasó la auditoría oficial de Reniec. Verifica el número.`, 'error');
                    return;
                }
            } else {
                // Si colocó DNI opcional pero está incompleto o mal hecho
                if (documento.length > 0 && documento.length !== 8) {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: Si deseas registrar un DNI opcional, este debe tener exactamente 8 dígitos.`, 'error');
                    return;
                }
                if (documento.length === 8 && t.docStatus !== 'OK') {
                    AppUtils.showNotification(`🚨 Ticket #${i + 1}: El DNI opcional ingresado es incorrecto o inexistente en el padrón nacional.`, 'error');
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
                        productoId: p.productoId || p.id,
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
                    productoId: p.productoId || p.id,
                    nombre: p.nombre.trim(),
                    cantidad: p.cantidad,
                    precioUnitario: Math.round((p.subtotal / p.cantidad) * 100) / 100,
                    subtotal: Math.round(p.subtotal * 100) / 100
                }));
        }

        listaPlatosModificados.sort((a, b) => a.nombre.localeCompare(b.nombre));

        const nombreFinalComprobante = t.nombreCliente ? t.nombreCliente.trim() : "";

    return {
            ticketId: t.id + 1,
            consumoFinal: consumoFinalTicket,
            propina: t.propina,
            tipoDoc: t.tipoDoc,
            numDoc: t.numDoc || "SIN DOCUMENTO",
            nombreCliente: nombreFinalComprobante,
            clienteCorreo: t.clienteCorreo || "",
            metodoPago: t.metodoPago,
            numeroMesa: parseInt(currentMesaNumero),
            listaDetalles: listaPlatosModificados
        };
    });

    console.log("📦 PAYLOAD SINCRONIZADO ENVIADO A SPRING BOOT:", payloadTickets);

    let segundosRestantes = 5;
    Swal.fire({
        title: '<span style="color: #1B3A2C; font-weight: 800;">¿Confirmar Pago de Consumos?</span>',
        text: `Procesando ${ticketsDeCobro.length} tickets de forma segura. Por favor, verifique detalladamente los montos en la pantalla.`,
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
    console.log("📡 [BUG-HUNT-JS] >>> INICIANDO petición de liquidación al servidor <<<");

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

    // ── 🎯 ESCUDO DE IDENTIFICADORES HÍBRIDO (ANTI-CERO) ──
    let checksNativos = document.querySelectorAll('.chk-mesa-confirmar:checked');
    let idsPagados = Array.from(checksNativos).map(cb => cb.value);

    if (idsPagados.length === 0 && typeof platosDisponibles !== 'undefined' && platosDisponibles.length > 0) {
        console.log("🍽️ [La Jama Salón] Detectado flujo de mesero. Extrayendo IDs desde platosDisponibles en memoria...");

        if (typeof datosPedidoActualCaja !== 'undefined' && datosPedidoActualCaja && (datosPedidoActualCaja.detalles || datosPedidoActualCaja.listaDetalles)) {
            const detallesOriginales = datosPedidoActualCaja.detalles || datosPedidoActualCaja.listaDetalles;
            idsPagados = platosSeleccionadosParaCobro.map(idx => {
                return detallesOriginales[idx] ? detallesOriginales[idx].id : null;
            }).filter(id => id !== null);
        } else {
            let checksParciales = document.querySelectorAll('.chk-cobro-parcial:checked');
            if (checksParciales.length > 0) {
                idsPagados = Array.from(checksParciales).map(cb => {
                    const platoObj = platosDisponibles.find(p => p.id == cb.value);
                    return platoObj ? platoObj.productoId : cb.value;
                });
            }
        }
    }

    urlParams.append("idsDetallesPagados", idsPagados.join(','));

    try {
        const res = await fetch(`/admin/mesas/comanda/liquidar-bloque-multiticket/${currentPedidoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlParams
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            console.log("🎯 [BUG-HUNT-JS] Servidor procesó el cobro con ÉXITO (res.ok).");

            const elModalCaja = document.getElementById('modalFacturacion');
            if (elModalCaja) {
                const modalBootstrap = bootstrap.Modal.getInstance(elModalCaja);
                if (modalBootstrap) modalBootstrap.hide();
            }

            if (typeof cargarLiquidadosTurnoAsincrono === 'function') {
                cargarLiquidadosTurnoAsincrono();
            }

            // ─── 🛡️ TU NUEVO REINICIADOR ATÓMICO ANTI-ZOMBIE ───
            Swal.fire({
                icon: 'success',
                title: '¡Cobro Procesado Exitosamente!',
                text: 'La venta ha sido registrada en caja.',
                confirmButtonColor: '#1B3A2C',
                confirmButtonText: 'Ok',
                allowOutsideClick: false,
                allowEscapeKey: false
            }).then((result) => {
                if (result.isConfirmed) {
                    // 🚀 REFRESH TOTAL: Reconstruye el plano, limpia la UI y libera las mesas de residuos visuales
                    window.location.reload();
                }
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
        console.error("🚨 FALLO CRÍTICO en la petición Fetch:", error);
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

    // Si no hay nada seleccionado, bloqueamos el botón de cobro
    if (checksMarcados.length === 0) {
        btnDesocupar.classList.add('disabled');
        btnDesocupar.disabled = true;
        btnDesocupar.style.opacity = "0.5";
        if (typeof recalcularSubtotalElegido === 'function') recalcularSubtotalElegido();
        return;
    }

    // 🟢 OPTIMIZACIÓN ELÁSTICA: Permitimos cobrar sin importar el estado logístico
    // Ya no discriminamos si el plato está 'En cocina' o 'Listo' al momento de pagar la cuenta
    const sePermite = checksMarcados.length > 0;

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
        const filaPlato = checkbox.closest('.item-plato-comanda');
        if (filaPlato) {
            sumaAcumulada += parseFloat(filaPlato.getAttribute('data-precio')) || 0;
        }
    });

    txtElegido.innerText = sumaAcumulada.toFixed(2);
}