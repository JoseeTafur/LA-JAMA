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

    const idsPagados = Array.from(document.querySelectorAll('.chk-mesa-confirmar:checked')).map(cb => cb.value);
    urlParams.append("idsDetallesPagados", idsPagados.join(','));

    console.log(`📡 [BUG-HUNT-JS] Enviando PedidoId Padre: ${currentPedidoId} | MesaId: ${currentMesaId}`);
    console.log(`📡 [BUG-HUNT-JS] Platos que se están pagando en este instante (IDs):`, idsPagados);

    try {
        const res = await fetch(`/admin/mesas/comanda/liquidar-bloque-multiticket/${currentPedidoId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: urlParams
        });

        console.log(`📡 [BUG-HUNT-JS] Respuesta HTTP del servidor recibida. Status: ${res.status}`);
        AppUtils.showLoading(false);

        if (res.ok) {
            console.log("🎯 [BUG-HUNT-JS] Servidor procesó el cobro con ÉXITO (res.ok).");

            // Guardamos temporalmente el número de mesa antes de que cualquier otra función lo altere
            const mesaParaRefrescar = currentMesaNumero;
            console.log(`🎯 [BUG-HUNT-JS] Guardando número de mesa de respaldo para refrescar: ${mesaParaRefrescar}`);

            // Ejecutamos tu actualización contable del turno si existe
            if (typeof cargarLiquidadosTurnoAsincrono === 'function') {
                cargarLiquidadosTurnoAsincrono();
            }

            Swal.fire({
                icon: 'success',
                title: '¡Cobro Procesado!',
                text: 'Los comprobantes fiscales han sido enviados a cola de timbrado de forma segura.',
                confirmButtonColor: '#1B3A2C'
            }).then(() => {
                console.log("🔮 [BUG-HUNT-JS] Alerta de éxito cerrada por el usuario. Evaluando estado de la comanda...");

                // 🍔 REPARACIÓN DEL FRONTEND ANTI-BLANQUEO:
                // En vez de reventar la pantalla borrando todo, llamamos a la función nativa
                // de 'modal-mesa.js' para que vuelva a traer la comanda viva desde el controlador.
                if (typeof cargarDetalleComandaAsincrono === 'function' && mesaParaRefrescar) {
                    console.log(`🔮 [BUG-HUNT-JS] Forzando recarga asíncrona de platos en pantalla para Mesa N° ${mesaParaRefrescar}`);

                    // Remonitorizamos el modal pasándole un estado activo para que pinte los platos con deuda 0
                    cargarDetalleComandaAsincrono('ATENDIDO');

                    // Si tienes un modal contenedor de la mesa principal, lo volvemos a mostrar estable
                    if (typeof mesaModal !== 'undefined' && mesaModal) {
                        mesaModal.show();
                    }
                } else {
                    console.warn("⚠️ [BUG-HUNT-JS] No se encontró la función cargarDetalleComandaAsincrono, ejecutando limpieza por defecto.");
                    limpiarInstanciaCaja();
                }
            });
        } else {
            const txtError = await res.text();
            console.error("🚨 [BUG-HUNT-JS] El servidor rechazó la operación. Detalle:", txtError);
            AppUtils.showNotification(txtError || "Error en la liquidación", "error");
            if (btnCierreGlobal) {
                btnCierreGlobal.disabled = false;
                btnCierreGlobal.innerHTML = `<i class="bi bi-shield-check me-2"></i> Procesar Cierre Masivo`;
            }
        }
    } catch (error) {
        AppUtils.showLoading(false);
        console.error("🚨 [BUG-HUNT-JS] FALLO CRÍTICO en la petición Fetch (Catch):", error);
        if (btnCierreGlobal) {
            btnCierreGlobal.disabled = false;
            btnCierreGlobal.innerHTML = `<i class="bi bi-shield-check me-2"></i> Procesar Cierre Masivo`;
        }
    }
    console.log("📡 [BUG-HUNT-JS] >>> FIN del flujo ejecutarEnvioBackend <<<");
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