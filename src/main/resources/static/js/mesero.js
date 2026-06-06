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

    document.getElementById('modalNombrePlato').innerText = nombre;
    document.getElementById('listaInsumosModal').innerHTML = '<div class="text-center py-2"><span class="spinner-border spinner-border-sm text-primary"></span></div>';

    if (bsModalInsumos) bsModalInsumos.show();

    try {
        const res = await fetch('/insumos/producto/' + id);
        insumosProductoActual = await res.json();

        if (insumosProductoActual.length === 0) {
            // Si no tiene insumos modificables, entra directo al carrito sin hacer perder tiempo al mesero
            if (bsModalInsumos) bsModalInsumos.hide();
            agregarAlCarrito(id, nombre, precio, [], []);
        } else {
            let html = '';
            insumosProductoActual.forEach(ins => {
                html += `
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox"
                               id="ins_${ins.idInsumo}"
                               value="${ins.idInsumo}"
                               data-nombre="${ins.nombreInsumo}"
                               checked>
                        <label class="form-check-label small cursor-pointer" for="ins_${ins.idInsumo}">
                            ${ins.nombreInsumo} <span class="text-muted">(${ins.cantidadUsada} ${ins.unidadMedida})</span>
                        </label>
                    </div>`;
            });
            document.getElementById('listaInsumosModal').innerHTML = html;
        }
    } catch (e) {
        document.getElementById('listaInsumosModal').innerHTML = '<p class="text-danger small mb-0">No se pudieron cargar los insumos.</p>';
    }
}

function cerrarModal() {
    if (bsModalInsumos) bsModalInsumos.hide();
    productoTemporal = null;
    insumosProductoActual = [];
}

function confirmarAgregarAlCarrito() {
    if (!productoTemporal) return;

    const idsSinDescontar = [];
    const nombresSinDescontar = [];

    insumosProductoActual.forEach(ins => {
        const checkbox = document.getElementById('ins_' + ins.idInsumo);
        if (checkbox && !checkbox.checked) {
            idsSinDescontar.push(ins.idInsumo);
            nombresSinDescontar.push(ins.nombreInsumo); // Capturamos el nombre para la UX visual
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
    // CORRECCIÓN: Para agrupar, ahora evaluamos que el producto coincida Y QUE TENGA LOS MISMOS INSUMOS RETIRADOS
    const existe = carrito.find(item =>
        item.productoId === id &&
        JSON.stringify(item.insumosSinDescontar.sort()) === JSON.stringify(idsSin.sort())
    );

    if (existe) {
        existe.cantidad++;
        existe.subtotal = existe.cantidad * precio;
    } else {
        carrito.push({
            productoId: id,
            nombre,
            precio,
            cantidad: 1,
            subtotal: precio,
            insumosSinDescontar: idsSin,
            nombresSinDescontar: nombresSin // Guardamos los nombres para renderizar en el carrito
        });
    }
    renderizarCarrito();
}

function renderizarCarrito() {
    const container = document.getElementById('lista-items');
    let total = 0;

    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 opacity-50">
                <i class="bi bi-cart-x" style="font-size: 3rem;"></i>
                <p class="mt-2 mb-0">Comanda vacía</p>
            </div>`;
        document.getElementById('total-monto').innerText = "0.00";
        return;
    }

    let html = '';
    carrito.forEach((item, index) => {
        total += item.subtotal;

        // CORRECCIÓN VISUAL: Ahora pinta los nombres de los ingredientes ("Sin: Cebolla") en vez de IDs numéricos
        const sinEsto = item.nombresSinDescontar && item.nombresSinDescontar.length > 0
            ? `<small class="text-danger d-block fw-bold" style="font-size:0.75rem;"><i class="bi bi-dash-circle-fill me-1"></i>Sin: ${item.nombresSinDescontar.join(', ')}</small>`
            : '';

        html += `
            <div class="cart-item-card shadow-sm border-0 animate__animated animate__fadeIn">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="d-block fw-bold text-dark">${item.nombre}</span>
                        <small class="text-muted">${item.cantidad} x S/ ${item.precio.toFixed(2)}</small>
                        ${sinEsto}
                    </div>
                    <div class="text-end">
                        <span class="d-block fw-bold text-primary">S/ ${item.subtotal.toFixed(2)}</span>
                        <button class="btn btn-sm text-danger p-0 mt-1" onclick="eliminarItem(${index})">
                           <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    });
    container.innerHTML = html;
    document.getElementById('total-monto').innerText = total.toFixed(2);
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

        // --- SOLUCIÓN DIRECTA PARA COCINA ---
        // Recorremos el carrito recolectando lo que el cliente quitó para armar la nota automática
        let notasDeOmision = [];
        carrito.forEach(item => {
            if (item.nombresSinDescontar && item.nombresSinDescontar.length > 0) {
                notasDeOmision.push(`${item.nombre} (SIN: ${item.nombresSinDescontar.join(', ')})`);
            }
        });

        // Almacenamos la nota del input del mesero y le sumamos las exclusiones de ingredientes de forma legible
        const notaUsuario = document.getElementById('direccion').value || "";
        let notaFinalParaCocina = notaUsuario;

        if (notasDeOmision.length > 0) {
            notaFinalParaCocina += (notaFinalParaCocina ? " | " : "") + "🚨 " + notasDeOmision.join(" - ");
        }
        // ------------------------------------

        const pedido = {
            id: pedidoId ? parseInt(pedidoId) : null,
            cliente: document.getElementById('cliente').value || "Mesa " + mesaId,
            direccion: notaFinalParaCocina, // <-- AQUÍ SE ENVÍA TODA LA EXCLUSIÓN DE FORMA SEGURA
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
                    window.location.href = '/admin/mesas';
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