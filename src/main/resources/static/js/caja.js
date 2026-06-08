// =======================================================
// ESTADO GLOBAL DE CONTROL DE CAJA
// =======================================================
let selectedPedidoId = null;
let selectedMesaId   = null;
let totalComanda     = 0.0;
let currentMesaNumero = null;

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('param-aprobado')) AppUtils.showNotification("Pedido enviado a cocina.", "success");
    if (document.getElementById('param-success')) AppUtils.showNotification("¡Cobro cuadrado e ingreso registrado en libro de caja!", "success");

    // Buscador en tiempo real para la tabla de caja
    const buscador = document.getElementById('buscadorPedido');
    const tabla = document.getElementById('tablaCaja')?.getElementsByTagName('tbody')[0];

    if (buscador && tabla) {
        buscador.addEventListener('keyup', function() {
            const texto = buscador.value.toLowerCase();
            const filas = tabla.getElementsByTagName('tr');
            Array.from(filas).forEach(fila => {
                if (fila.textContent.toLowerCase().includes(texto)) fila.style.display = '';
                else fila.style.display = 'none';
            });
        });
    }
});

function abrirPlanoMesasDesdeCaja() {
    const iframe = document.getElementById('iframePlanoMesas');
    if (iframe) iframe.contentWindow.location.reload();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPlanoMesasCaja')).show();
}

function verDetallesComandaAuditoria(btn) {
    const pedidoId = btn.getAttribute('data-id');
    AppUtils.showLoading(true);

    fetch(`/admin/caja/api/pedido/${pedidoId}`)
        .then(res => {
            if (!res.ok) throw new Error("No se pudo leer la comanda");
            return res.json();
        })
        .then(data => {
            AppUtils.showLoading(false);

            document.getElementById('auditoriaIdPedido').innerText = data.id;
            document.getElementById('auditoriaTipo').innerText = data.tipoPedido;
            document.getElementById('auditoriaMesa').innerText = data.numeroMesa || "N/A";
            document.getElementById('auditoriaTotal').innerText = data.montoTotal.toFixed(2);

            // Mapeo seguro de la propina recaudada en el POS/Tablet
            document.getElementById('auditoriaPropina').innerText = data.montoPropina ? data.montoPropina.toFixed(2) : "0.00";

            const lista = document.getElementById('auditoriaListaPlatos');
            lista.innerHTML = "";

            data.detalles.forEach(d => {
                if (d.canceladoPorCliente) return; // Filtro de mermas
                lista.innerHTML += `
                    <div class="list-group-item d-flex justify-content-between align-items-center small">
                        <span><strong>${d.cantidad}x</strong> ${d.producto.nombre}</span>
                        <span class="text-muted">S/. ${d.subtotal.toFixed(2)}</span>
                    </div>`;
            });

            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetalleAuditoria')).show();
        })
        .catch(err => {
            AppUtils.showLoading(false);
            AppUtils.showNotification("Error al cargar los detalles", "error");
        });
}

// =======================================================
// CONTROL DE FACTURACIÓN ELECTRÓNICA Y MODAL DINÁMICO
// =======================================================
function abrirModalFacturacion(pedidoId, tipo) {
    document.getElementById('fiscalPedidoId').value = pedidoId;
    document.getElementById('fiscalTipoDoc').value = tipo;
    document.getElementById('fiscalTituloTipo').innerText = tipo;

    const inputDoc = document.getElementById('fiscalInputDoc');
    const labelDoc = document.getElementById('labelDocumentoFiscal');
    const ayudaDoc = document.getElementById('ayudaDocumentoFiscal');

    inputDoc.value = ""; // Limpiar inputs anteriores

    if (tipo === 'FACTURA') {
        labelDoc.innerText = "Número de RUC de la Empresa *";
        inputDoc.placeholder = "Ingrese los 11 dígitos del RUC";
        inputDoc.required = true;
        inputDoc.setAttribute("minLength", "11");
        inputDoc.setAttribute("maxLength", "11");
        ayudaDoc.innerText = "Obligatorio para sustentar crédito fiscal. Se validará la longitud de 11 dígitos.";
    } else {
        labelDoc.innerText = "Número de DNI del Cliente (Opcional)";
        inputDoc.placeholder = "Clientes Varios";
        inputDoc.required = false;
        inputDoc.removeAttribute("minLength");
        inputDoc.setAttribute("maxLength", "8");
        ayudaDoc.innerText = "Para boletas menores a S/. 700 puede quedar vacío como 'Clientes Varios'.";
    }

    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEmisionFiscal')).show();
}

function anularComprobante(pedidoId) {
    if (confirm("⚠️ ¿Estás seguro de que deseas ANULAR este comprobante?\n\nEsta acción registrará una Nota de Crédito en el sistema y liberará la orden para volver a emitir un comprobante corregido.")) {
        // Redirección directa al endpoint de anulación por simplicidad (puedes crear este endpoint en tu CajaController después)
        window.location.href = `/admin/caja/anular-comprobante?pedidoId=${pedidoId}`;
    }
}