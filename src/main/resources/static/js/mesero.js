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

    // Guardamos el estado temporal del plato por si pasa la aduana
    productoTemporal = { id, nombre, precio };

    // ─── 🛡️ ADUANA RECTIFICADORA: CONTROL DE PLATOS SIN RECETA ───
    try {
        // Bloqueamos la UI un milisegundo para la consulta ligera
        document.body.style.cursor = 'wait';

        const res = await fetch('/insumos/producto/' + id);
        insumosProductoActual = await res.json();

        document.body.style.cursor = 'default';

        // 🔥 REG DE NEGOCIO: Si el array viene vacío, el plato está "Húfano" (Sin insumos asignados)
        if (!insumosProductoActual || insumosProductoActual.length === 0) {
            AppUtils.showNotification(`⚠️ El plato [${nombre}] no tiene insumos configurados en el recetario. Avisa al Administrador.`, 'error');
            productoTemporal = null;
            insumosProductoActual = [];
            return; // 🛑 Frenamos en seco, no abre modal ni entra al carrito
        }

    } catch (e) {
        document.body.style.cursor = 'default';
        console.error("Error al validar receta del plato:", e);
        AppUtils.showNotification('No se pudo verificar la composición del plato.', 'error');
        return;
    }
    // ─────────────────────────────────────────────────────────────

    // Si pasó el escudo de arriba, el flujo original continúa con total normalidad...
    document.getElementById('modalNombrePlato').innerText = nombre;
    document.getElementById('listaInsumosModal').innerHTML = '<div class="text-center py-2"><span class="spinner-border spinner-border-sm text-primary"></span></div>';

    if (bsModalInsumos) bsModalInsumos.show();

    // 🔥 PALABRAS CLAVE DE PROTEÍNAS EN LA JAMA:
    const palabrasClaveProteina = ["PESCADO", "CARNE", "POLLO", "LOMO", "CHANCHO", "MARISCO", "RES", "PATO"];

    // Filtramos los insumos para el modal de exclusión
    const insumosModificables = insumosProductoActual.filter(ins => {
        if (!ins.nombreInsumo) return true;
        const nombreInsumoUpper = ins.nombreInsumo.toUpperCase();
        return !palabrasClaveProteina.some(palabra => nombreInsumoUpper.includes(palabra));
    });

    if (insumosModificables.length === 0) {
        // Si solo tiene su proteína base fija (ej. Lomo), va directo al carrito
        if (bsModalInsumos) bsModalInsumos.hide();
        agregarAlCarrito(id, nombre, precio, [], []);
    } else {
        let html = '';
        insumosModificables.forEach(ins => {
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
    // 🔥 REGLA DE NEGOCIO: Eliminamos la agrupación masiva (x2, x3).
    // Cada plato ingresa al carrito de manera individual.
    carrito.push({
        productoId: id,
        nombre,
        precio,
        cantidad: 1, // Siempre será 1 por fila individual
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
                <i class="bi bi-cart-x" style="font-size: 3rem;"></i>
                <p class="mt-2 mb-0">Comanda vacía</p>
            </div>`;
        document.getElementById('total-monto').innerText = "0.00";
        return;
    }

    let html = '';
    carrito.forEach((item, index) => {
        total += item.subtotal;

        const sinEsto = item.nombresSinDescontar && item.nombresSinDescontar.length > 0
            ? `<small class="text-danger d-block fw-bold" style="font-size:0.75rem;"><i class="bi bi-dash-circle-fill me-1"></i>Sin: ${item.nombresSinDescontar.join(', ')}</small>`
            : '';

        html += `
            <div class="cart-item-card shadow-sm border-0 animate__animated animate__fadeIn">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="d-block fw-bold text-dark">${item.nombre}</span>
                        <small class="text-muted">1 unidad x S/ ${item.precio.toFixed(2)}</small>
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