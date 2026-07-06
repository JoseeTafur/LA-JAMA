let carrito = [];
let productoTemporal = null;
let insumosProductoActual = [];
let bsModalInsumos = null;

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('modalInsumos');
    if (modalEl) {
        bsModalInsumos = new bootstrap.Modal(modalEl);
    }
});

async function abrirModalInsumos(elemento) {
    const id = elemento.getAttribute('data-id');
    const nombre = elemento.getAttribute('data-nombre');
    const precio = parseFloat(elemento.getAttribute('data-precio'));

    productoTemporal = { id, nombre, precio };

    // ─── 🛡️ ADUANA RECTIFICADORA: CONTROL DE PLATOS SIN RECETA ───
    try {
        document.body.style.cursor = 'wait';

        const res = await fetch('/insumos/producto/' + id);
        insumosProductoActual = await res.json();

        document.body.style.cursor = 'default';

        if (!insumosProductoActual || insumosProductoActual.length === 0) {
            AppUtils.showNotification(`⚠️ El plato [${nombre}] no tiene insumos configurados en el recetario. Avisa al Administrador.`, 'error');
            productoTemporal = null;
            insumosProductoActual = [];
            return;
        }

    } catch (e) {
        document.body.style.cursor = 'default';
        console.error("Error al validar receta del plato:", e);
        AppUtils.showNotification('No se pudo verificar la composición del plato.', 'error');
        return;
    }
    // ─────────────────────────────────────────────────────────────

    // 🥩 CONTROL DE ADUANA DINÁMICO EN SEGUNDO PLANO (REGLA DE PROTEÍNAS)
    const proteinaBase = insumosProductoActual.find(ins =>
        ins.categoriaInsumo && ins.categoriaInsumo.toUpperCase() === "PROTEINA"
    );

    if (proteinaBase) {
        // Ecuación matemática del escudo defensivo: Stock Seleccionable = Stock Total - Stock Comprometido
        const stockActualInsumo = parseFloat(proteinaBase.stockActual || 0);
        const stockComprometidoInsumo = parseFloat(proteinaBase.stockComprometido || 0);
        const stockDisponibleReal = stockActualInsumo - stockComprometidoInsumo;

        const cantidadUsadaPorPlato = parseFloat(proteinaBase.cantidadUsada || 1);
        const maxPlatosPermitidos = Math.floor(stockDisponibleReal / cantidadUsadaPorPlato);

        // Contamos cuántos de este plato ya están en el carrito local
        const cantidadEnCarritoLocal = carrito.filter(item => item.productoId === id).length;

        if (cantidadEnCarritoLocal >= maxPlatosPermitidos) {
            AppUtils.showNotification(`🚨 Acción Bloqueada: Stock límite alcanzado. Solo quedan porciones en cocina para ${maxPlatosPermitidos} plato(s) y ya tienes ${cantidadEnCarritoLocal} en la comanda.`, 'error');
            productoTemporal = null;
            return;
        }
    }

    document.getElementById('modalNombrePlato').innerText = nombre;
    document.getElementById('listaInsumosModal').innerHTML = '<div class="text-center py-2"><span class="spinner-border spinner-border-sm text-primary"></span></div>';

    // 🌟 FILTRADO 100% DINÁMICO: Excluimos del modal los que son PROTEINA desde la BD
    const insumosModificables = insumosProductoActual.filter(ins => {
        return !(ins.categoriaInsumo && ins.categoriaInsumo.toUpperCase() === "PROTEINA");
    });

    if (insumosModificables.length === 0) {
        // Si el plato solo tiene su proteína base fija e intocable, va directo a la canasta
        agregarAlCarrito(id, nombre, precio, [], []);
    } else {
        if (bsModalInsumos) bsModalInsumos.show();
        let html = '';
        insumosModificables.forEach(ins => {
            const idCheckboxDinamico = `cbx_${ins.idInsumo}`;
            html += `
                <div class="d-flex align-items-center mb-3">
                    <div class="cntr">
                        <input type="checkbox"
                               id="${idCheckboxDinamico}"
                               class="hidden-xs-up"
                               value="${ins.idInsumo}"
                               data-nombre="${ins.nombreInsumo}"
                               checked>
                        <label for="${idCheckboxDinamico}" class="cbx"></label>
                        <label for="${idCheckboxDinamico}" class="lbl">
                            ${ins.nombreInsumo} <span class="text-muted" style="font-weight: 500; font-size: 0.85rem;">(${ins.cantidadUsada} ${ins.unidadMedida})</span>
                        </label>
                    </div>
                </div>`;
        });
        document.getElementById('listaInsumosModal').innerHTML = html;
    }
}

function cerrarModal() {
    if (bsModalInsumos) bsModalInsumos.hide();
    productoTemporal = null;
    insumosProductoActual = [];
}

function confirmarAgregarAlCarrito() {
    if (!productoTemporal) return;

    // 🥩 CONTROL DE ADUANA EN LA CONFIRMACIÓN DEL MODAL
    const proteinaBase = insumosProductoActual.find(ins =>
        ins.categoriaInsumo && ins.categoriaInsumo.toUpperCase() === "PROTEINA"
    );

    if (proteinaBase) {
        const stockDisponibleReal = parseFloat(proteinaBase.stockActual || 0) - parseFloat(proteinaBase.stockComprometido || 0);
        const maxPlatosPermitidos = Math.floor(stockDisponibleReal / parseFloat(proteinaBase.cantidadUsada || 1));
        const cantidadEnCarritoLocal = carrito.filter(item => item.productoId === productoTemporal.id).length;

        if (cantidadEnCarritoLocal >= maxPlatosPermitidos) {
            AppUtils.showNotification(`🚨 Acción Bloqueada: No puedes añadir más porciones. Límite de stock físico alcanzado.`, 'error');
            cerrarModal();
            return;
        }
    }

    const idsSinDescontar = [];
    const nombresSinDescontar = [];

    insumosProductoActual.forEach(ins => {
        const checkbox = document.getElementById('cbx_' + ins.idInsumo);
        if (checkbox && !checkbox.checked) {
            idsSinDescontar.push(ins.idInsumo);
            nombresSinDescontar.push(ins.nombreInsumo);
        }
    });

    agregarAlCarrito(
        productoTemporal.id,
        productoTemporal.nombre,
        productoTemporal.precio,
        idsSinDescontar,
        nombresSinDescontar
    );

    cerrarModal();
}

function agregarAlCarrito(id, nombre, precio, idsSin, nombresSin) {
    // 🥩 CONTROL DE ADUANA DE PROTEÍNA PARA INGRESO DIRECTO SIN PASAR POR EL MODAL
    const proteinaBase = insumosProductoActual.find(ins =>
        ins.categoriaInsumo && ins.categoriaInsumo.toUpperCase() === "PROTEINA"
    );

    if (proteinaBase) {
        const stockDisponibleReal = parseFloat(proteinaBase.stockActual || 0) - parseFloat(proteinaBase.stockComprometido || 0);
        const maxPlatosPermitidos = Math.floor(stockDisponibleReal / parseFloat(proteinaBase.cantidadUsada || 1));
        const cantidadEnCarritoLocal = carrito.filter(item => item.productoId === id).length;

        if (cantidadEnCarritoLocal >= maxPlatosPermitidos) {
            AppUtils.showNotification(`🚨 No puedes agregar más porciones de [${nombre}]. Stock de proteína agotado por alta demanda.`, 'error');
            return;
        }
    }

    carrito.push({
        productoId: id,
        nombre,
        precio,
        cantidad: 1,
        subtotal: precio,
        insumosSinDescontar: idsSin,
        nombresSinDescontar: nombresSin
    });

    renderizarCarrito();
}

function renderizarCarrito() {
    const container = document.getElementById('lista-items');
    let total = 0;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 opacity-50">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted mb-2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
                <p class="mt-1 mb-0 small fw-bold text-secondary">Comanda vacía</p>
            </div>`;
        document.getElementById('total-monto').innerText = "0.00";
        return;
    }

    let html = '';
    carrito.forEach((item, index) => {
        total += item.subtotal;

        const sinEsto = item.nombresSinDescontar && item.nombresSinDescontar.length > 0
            ? `<small class="text-danger d-block fw-bold font-monospace mt-1" style="font-size:0.75rem;"><i class="bi bi-dash-circle-fill me-1"></i>Sin: ${item.nombresSinDescontar.join(', ')}</small>`
            : '';

        html += `
            <div class="cart-item-premium-row">
                <div class="item-ticket-details">
                    <span class="item-ticket-title text-dark">${item.nombre}</span>
                    <span class="item-ticket-price-unit">1 unidad x S/ ${item.precio.toFixed(2)}</span>
                    ${sinEsto}
                </div>
                <div class="item-ticket-actions">
                    <span class="item-ticket-total">S/ ${item.subtotal.toFixed(2)}</span>
                    <button type="button" class="btn-trash-ticket" onclick="eliminarItem(${index})" title="Eliminar Renglón">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </div>
            </div>`;
    });

    container.innerHTML = html;
    document.getElementById('total-monto').innerText = total.toFixed(2);
}

function limpiarBuscadorCarta() {
    const input = document.getElementById('buscador');
    if (input) {
        input.value = '';
        filtrarProductos();
        input.focus();
    }
}

function eliminarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

function filtrarProductos() {
    const texto = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('.producto-card').forEach(tarjeta => {
        const nombre = tarjeta.querySelector('.nombre-producto').innerText.toLowerCase();
        tarjeta.style.display = nombre.includes(texto) ? '' : 'none';
    });
}

function enviarPedido() {
    const urlParams = new URLSearchParams(window.location.search);
    const mesaId = urlParams.get('mesaId');
    const pedidoId = urlParams.get('pedidoId');

    let pedidoIdRaw = urlParams.get('pedidoId');
    if (pedidoIdRaw === "null" || pedidoIdRaw === "") {
        pedidoIdRaw = null;
    }

    if (carrito.length === 0) {
        AppUtils.showNotification("⚠️ Agrega al menos un producto a la comanda", "warning");
        return;
    }

    AppUtils.showConfirmationDialog({
        title: '¿Enviar Comanda a Cocina?',
        text: `Se mandarán las órdenes activas para la Mesa #${mesaId || 'Salón'}.`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, mandar a cocina'
    }, async function() {

        AppUtils.showLoading(true);

        let notasDeOmision = [];
        carrito.forEach(item => {
            if (item.nombresSinDescontar && item.nombresSinDescontar.length > 0) {
                notesDeOmision.push(`${item.nombre} (SIN: ${item.nombresSinDescontar.join(', ')})`);
            }
        });

        const notaUsuario = document.getElementById('direccion').value || "";
        let notaFinalParaCocina = notaUsuario;

        if (notasDeOmision.length > 0) {
            notaFinalParaCocina += (notaFinalParaCocina ? " | " : "") + "🚨 " + notasDeOmision.join(" - ");
        }

        const pedido = {
            id: pedidoId ? parseInt(pedidoId) : null,
            cliente: document.getElementById('cliente').value || "Mesa " + mesaId,
            direccion: notaFinalParaCocina,
            listaDetalles: carrito.map(item => ({
                producto: { id: parseInt(item.productoId) },
                cantidad: item.cantidad,
                precioUnitario: item.precio,
                subtotal: item.subtotal,
                insumosSinDescontar: item.insumosSinDescontar || []
            }))
        };

        try {
            const response = await fetch('/admin/mesero/guardar' + (mesaId ? '?mesaId=' + mesaId : ''), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pedido)
            });

            const resultadoTexto = await response.text();
            AppUtils.showLoading(false);

            if (resultadoTexto === "OK") {
                Swal.fire({
                    icon: 'success',
                    title: '¡Comanda Enviada!',
                    text: 'La orden ha sido distribuida a las estaciones de cocina de La Jama.',
                    confirmButtonColor: '#1B3A2C'
                }).then(() => {
                    if (urlParams.get('embed') === 'true') {
                        window.location.href = '/admin/mesas?embed=true';
                    } else {
                        window.location.href = '/admin/mesas';
                    }
                });
            } else {
                AppUtils.showNotification("Error al procesar el pedido: " + resultadoTexto, "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error:", error);
            AppUtils.showNotification("❌ Fallo de conexión con el servidor", "error");
        }
    });
}