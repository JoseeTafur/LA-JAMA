// =======================================================
// GESTIÓN DE COMANDA (carga, entrega, eliminación) - comanda.js
// =======================================================
function cargarDetalleComandaAsincrono(pedidoEstado) {
    const contenedorComanda = document.getElementById('contenedor-previsualizacion-comanda');
    const listaPlatos       = document.getElementById('lista-platos-previsualizar');
    const txtSubtotal       = document.getElementById('txt-subtotal-previsualizar');
    const avisoVacio        = document.getElementById('comanda-vacia-aviso');
    const panelSubtotal     = document.getElementById('panel-subtotal-modal');
    const badgeTicket       = document.getElementById('badge-ticket');

    const tarjetaMesaDOM = document.getElementById(`mesa-card-${currentMesaId}`);

    // 🛡️ DETECTOR ABSOLUTO DE UNIFICACIÓN: Evaluamos clases, flag padre o llaves foráneas del HTML
    const esPadreGrupo   = tarjetaMesaDOM ? tarjetaMesaDOM.getAttribute('data-es-padre') === 'SI' : false;
    const esUnificada    = tarjetaMesaDOM ? (tarjetaMesaDOM.classList.contains('unificada') ||
                            tarjetaMesaDOM.getAttribute('data-id-mesa-padre') != null ||
                            esPadreGrupo) : false;

    if (currentPedidoId && currentPedidoId !== "" && pedidoEstado !== 'NINGUNO') {
        fetch(`/admin/mesas/precuenta/${currentMesaNumero}`)
            .then(res => {
                if (!res.ok) throw new Error("Sin consumos");
                return res.json();
            })
            .then(data => {
                if (txtSubtotal) txtSubtotal.innerText = (data.montoTotal != null ? data.montoTotal : 0.0).toFixed(2);
                if (listaPlatos) listaPlatos.innerHTML = "";

                const ticketImpreso = data.ticketImpresoCocina === true || data.ticketImpreso === true;
                if (badgeTicket) badgeTicket.classList.toggle('d-none', !ticketImpreso);

                const platosArray = data.listaDetalles || data.detalles || [];

                const tienePlatosPorPagar = platosArray.some(d => !d.pagado);
                const tienePlatosPorEntregar = platosArray.some(d => !d.canceladoPorCliente && d.cocinado && !d.entregado);
                const tienePlatosEnCocina = platosArray.some(d => !d.canceladoPorCliente && !d.cocinado);

                if (tarjetaMesaDOM) {
                    // Limpiamos los estados cromáticos anteriores de la tarjeta física
                    tarjetaMesaDOM.classList.remove('disponible', 'ocupada', 'lista-para-recoger', 'lista-para-pagar');
                    const iconoI = tarjetaMesaDOM.querySelector('.mesa-icon-wrapper i');

                    // 👑 PRIORIDAD CRÍTICA 1: SI LA MESA ES UNIFICADA, SU LOOK ES INVIOLABLE
                    if (esUnificada) {
                        tarjetaMesaDOM.classList.add('unificada');
                        if (iconoI) iconoI.className = "bi bi-link-45deg";

                        // Si la comanda se vació o completó, limpiamos el pedido pero MANTENEMOS la unificación morada
                        if (platosArray.length === 0 || (!tienePlatosPorPagar && !tienePlatosPorEntregar && !tienePlatosEnCocina)) {
                            tarjetaMesaDOM.setAttribute('data-pedido-id', '');
                            tarjetaMesaDOM.setAttribute('data-pedido-estado', 'NINGUNO');
                            if (avisoVacio)        avisoVacio.classList.remove('d-none');
                            if (contenedorComanda) contenedorComanda.classList.add('d-none');
                            if (panelSubtotal)     panelSubtotal.classList.add('d-none');
                            currentPedidoId = "";
                            renderizarControlesModal(esPadreGrupo, true, 'NINGUNO', tarjetaMesaDOM);
                            return;
                        }
                    }
                    // 🟢 CASO ORDINARIO CIERRE TOTAL (Mesa individual ordinaria vacía -> Va a libre Verde)
                    else if (platosArray.length === 0 || (!tienePlatosPorPagar && !tienePlatosPorEntregar && !tienePlatosEnCocina)) {
                        tarjetaMesaDOM.classList.add('disponible');
                        tarjetaMesaDOM.setAttribute('data-pedido-id', '');
                        tarjetaMesaDOM.setAttribute('data-pedido-estado', 'NINGUNO');
                        if (iconoI) iconoI.className = "bi bi-cup-hot-fill";

                        if (avisoVacio)        avisoVacio.classList.remove('d-none');
                        if (contenedorComanda) contenedorComanda.classList.add('d-none');
                        if (panelSubtotal)     panelSubtotal.classList.add('d-none');

                        currentPedidoId = "";
                        renderizarControlesModal(esPadreGrupo, false, 'NINGUNO', tarjetaMesaDOM);
                        if (mesaModal) mesaModal.hide();
                        return;
                    }

                    // 3️⃣ MÁQUINA DE ESTADOS REACTIVA POR PRIORIDAD DE CAÍDA (Solo si NO es unificada)
                    if (!esUnificada) {
                        let claseDestino = 'ocupada';
                        let iconoDestino = 'bi bi-cup-hot-fill';

                        if (tienePlatosPorEntregar) {
                            claseDestino = 'lista-para-recoger';
                            iconoDestino = 'bi bi-bell-fill';
                        } else if (tienePlatosEnCocina) {
                            claseDestino = 'ocupada';
                            iconoDestino = 'bi bi-cup-hot-fill';
                        } else if (tienePlatosPorPagar) {
                            claseDestino = 'lista-para-pagar';
                            iconoDestino = 'bi bi-person-check-fill';
                        }

                        tarjetaMesaDOM.classList.add(claseDestino);
                        if (iconoI) iconoI.className = `bi ${iconoDestino}`;
                    }

                    tarjetaMesaDOM.setAttribute('data-pedido-estado', tienePlatosEnCocina ? 'EN_COCINA' : 'PREPARADO');
                }

                // [El mapeo de platos en htmlPlatosActivos se queda exactamente igual]
                let htmlPlatosActivos = "";
                platosArray.forEach(d => {
                    const nombreProducto = d.producto && d.producto.nombre ? d.producto.nombre : (d.nombre || "Producto");
                    let badgeColor = 'bg-primary text-white', badgeTexto = 'Enviado', estiloFila = 'background-color: #ffffff;', bordeFila = 'border-left:4px solid var(--lajama-green) !important;', nombreClaseTexto = 'text-dark';
                    if (d.canceladoPorCliente) { badgeColor = 'bg-danger text-white'; badgeTexto = 'MERMA'; estiloFila = 'background-color: #ffe5e5; opacity: 0.85;'; bordeFila = 'border-left:4px solid #dc2626 !important;'; nombreClaseTexto = 'text-danger fw-bold text-decoration-line-through'; }
                    else if (d.cocinado && d.entregado) { badgeColor = 'bg-secondary text-white'; badgeTexto = 'Entregado'; estiloFila = 'opacity: 0.65; background-color: #f3f4f6;'; bordeFila = 'border-left:4px solid #6b7280 !important;'; }
                    else if (d.cocinado) { badgeColor = 'bg-success text-white'; badgeTexto = 'Listo'; bordeFila = 'border-left:4px solid #ffc107 !important;'; }
                    else if (ticketImpreso === true || d.impresoEnCocina === true) { badgeColor = 'bg-danger text-white'; badgeTexto = 'En cocina'; }
                    let btnCheckUnitarioHTML = ''; if (d.cocinado && !d.entregado && !d.canceladoPorCliente) { btnCheckUnitarioHTML = `<button type="button" class="btn btn-sm btn-warning text-dark px-2 py-1 rounded-pill ms-1" onclick="entregarPlatoUnitario(${currentPedidoId}, ${d.id}, '${nombreProducto}')" style="font-size:0.75rem; font-weight:700;"><i class="bi bi-check2"></i> Entregar</button>`; }
                    let btnEliminarHTML = ''; if (!d.cocinado && !d.pagado && !d.canceladoPorCliente) { const esMerma = (ticketImpreso === true || d.impresoEnCocina === true) ? 'true' : 'false'; const icono = (ticketImpreso === true || d.impresoEnCocina === true) ? 'bi-exclamation-triangle-fill text-warning' : 'bi-trash3-fill text-danger'; btnEliminarHTML = `<button type="button" class="btn btn-sm btn-link p-1 ms-1" onclick="eliminarItemComanda(${currentPedidoId}, ${d.id}, '${nombreProducto}', ${esMerma})"><i class="bi ${icono} fs-5"></i></button>`; }
                    let badgeFinancieroHTML = ''; if (d.pagado) { badgeFinancieroHTML = `<span class="badge bg-light text-success border border-success rounded-pill px-2 py-1" style="font-size:0.7rem;"><i class="bi bi-cash-coin me-1"></i>Pagado</span>`; }
                    const precioSeguro = d.subtotal ? d.subtotal : (d.precioUnitario ? d.precioUnitario : 0);
                    const idCheckModalMesa = `cbx_mesa_modal_${d.id}`;
                    let checkboxHTML = d.pagado ? `<div style="width: 27px; margin-left: 10px;"></div>` : `<div class="cntr" style="margin-left: 10px;"><input type="checkbox" id="${idCheckModalMesa}" class="hidden-xs-up chk-mesa-confirmar" value="${d.id}" data-precio="${precioSeguro}" data-estado-plato="${badgeTexto}" onchange="evaluarBotonConfirmarPago()"><label for="${idCheckModalMesa}" class="cbx"></label></div>`;
                    if (d.pagado && !d.canceladoPorCliente) { bordeFila = 'border-left:4px solid #16a34a !important;'; }
                    htmlPlatosActivos += `<div class="d-flex justify-content-between align-items-center p-2 rounded border item-plato-comanda mb-2 shadow-sm" data-estado="${badgeTexto}" data-precio="${d.subtotal || 0}" style="font-size:0.9rem; ${estiloFila} ${bordeFila}"><div class="d-flex align-items-center gap-2" style="max-width:50%;"><span class="badge bg-dark text-white rounded-pill fw-bold">${d.cantidad}x</span><span class="${nombreClaseTexto} fw-semibold text-truncate" style="max-width:140px;">${nombreProducto}</span></div><div class="d-flex align-items-center gap-2"><span class="text-muted small fw-bold">S/. ${precioSeguro.toFixed(2)}</span>${badgeFinancieroHTML}<span class="badge ${badgeColor} rounded-pill px-2 py-1" style="font-size:0.7rem;">${badgeTexto}</span>${btnCheckUnitarioHTML}${btnEliminarHTML}${checkboxHTML}</div></div>`;
                });

                listaPlatos.innerHTML = htmlPlatosActivos;
                if (contenedorComanda) contenedorComanda.classList.remove('d-none');
                if (panelSubtotal)     panelSubtotal.classList.remove('d-none');
                if (avisoVacio)        avisoVacio.classList.add('d-none');

                renderizarControlesModal(esPadreGrupo, esUnificada, tienePlatosEnCocina ? 'EN_COCINA' : 'PREPARADO', tarjetaMesaDOM);
            })
            .catch(err => {
                console.error("🚨 [La Jama] Error en precuenta unificada:", err);
                if (avisoVacio)        avisoVacio.classList.remove('d-none');
                if (panelSubtotal)     panelSubtotal.classList.add('d-none');
                if (contenedorComanda) contenedorComanda.classList.add('d-none');
                currentPedidoId = "";
                renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
            });
    } else {
        if (avisoVacio)        avisoVacio.classList.remove('d-none');
        if (panelSubtotal)     panelSubtotal.classList.add('d-none');
        if (contenedorComanda) contenedorComanda.classList.add('d-none');
        renderizarControlesModal(esPadreGrupo, esUnificada, 'NINGUNO', tarjetaMesaDOM);
    }
}

function entregarPlatoUnitario(pedidoId, detalleId, nombreProducto) {
    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Entrega?',
        text: `¿Confirmas que ya serviste "${nombreProducto}" en la Mesa N° ${currentMesaNumero}?`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, entregado'
    }, async function () {
        AppUtils.showLoading(true);
        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId);
        try {
            const res = await fetch('/admin/mesas/comanda/entregar-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification("Plato entregado correctamente", "success");
                cargarDetalleComandaAsincrono("EN_PROCESO");
            } else {
                AppUtils.showNotification("Error al registrar la entrega", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
        }
    });
}

function eliminarItemComanda(pedidoId, detalleId, nombreProducto, esMerma) {
    // Forzamos la conversión a booleano puro para evitar strings corruptos de red
    const valorMermaReal = (esMerma === true || esMerma === 'true');

    const titulo   = valorMermaReal ? '¿Declarar Merma?' : '¿Eliminar de la Comanda?';
    const text     = valorMermaReal
        ? `⚠️ El ticket ya se imprimió en cocina. Si anulas "${nombreProducto}" ahora, el cliente igual lo pagará y se alertará al cocinero para detener su preparación.`
        : `¿Estás seguro de remover "${nombreProducto}" de la orden actual? Se recalculará el total.`;
    const icono    = valorMermaReal ? 'warning' : 'question';
    const textoBtn = valorMermaReal ? 'Sí, anular y alertar' : 'Sí, remover plato';

    AppUtils.showConfirmationDialog({
        title: titulo, text, icon: icono,
        confirmButtonColor: '#dc3545', confirmButtonText: textoBtn
    }, async function () {
        AppUtils.showLoading(true);

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId);
        params.append("esMerma", valorMermaReal); // 🛡️ Enviamos "true" o "false" nativo

        try {
            const res = await fetch("/admin/mesas/comanda/eliminar-item", {
                method: "POST",
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            AppUtils.showLoading(false);
            if (res.ok) {
                AppUtils.showNotification(valorMermaReal ? "Plato anulado. Alerta enviada a cocina." : "Producto removido con éxito", "success");
                cargarDetalleComandaAsincrono(valorMermaReal ? "EN_COCINA" : "ENVIADO");
            } else {
                const errorText = await res.text();
                AppUtils.showNotification(errorText || "Error al anular el producto", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al eliminar item de comanda:", error);
        }
    });
}