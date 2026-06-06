document.addEventListener('DOMContentLoaded', function() {

    // --- 1. DETECCIÓN DE REDIRECCIÓN CON NOTIFICACIÓN DE APPUTILS ---
    if (document.getElementById('param-aprobado')) {
        AppUtils.showNotification("Pedido enviado a cocina correctamente.", "success");
    }

    if (document.getElementById('param-success')) {
        AppUtils.showNotification("El cobro se registró correctamente y la caja ha sido actualizada.", "success");
    }

    // --- 2. BUSCADOR EN TIEMPO REAL (INTEGRO E INTACTO) ---
    const buscador = document.getElementById('buscadorPedido');
    const tabla = document.getElementById('tablaCaja').getElementsByTagName('tbody')[0];

    if (buscador) {
        buscador.addEventListener('keyup', function() {
            const texto = buscador.value.toLowerCase();
            const filas = tabla.getElementsByTagName('tr');

            Array.from(filas).forEach(fila => {
                const contenido = fila.textContent.toLowerCase();
                if (contenido.indexOf(texto) !== -1) {
                    fila.style.display = '';
                } else {
                    fila.style.display = 'none';
                }
            });
        });
    }

    // --- 3. CONFIRMACIÓN DE COBRO (Liquidación con AppUtils) ---
    const formularios = document.querySelectorAll('.form-liquidar');

    formularios.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Frenamos el envío rústico inmediato

            AppUtils.showConfirmationDialog({
                title: '¿Confirmar Cobro?',
                text: '¿Confirmas que recibiste el pago de esta orden de forma conforme?',
                icon: 'question',
                confirmButtonColor: '#2b7a4a',
                confirmButtonText: 'Sí, cobrar'
            }, function() {
                // Si el usuario confirma, damos feedback de carga y ejecutamos
                const btn = form.querySelector('button');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';
                AppUtils.showLoading(true);
                form.submit(); // Lanza el post definitivo del formulario
            });
        });
    });

    // --- 4. ACCIONES DE CARTA DIGITAL (Aprobar con AppUtils) ---
    const formulariosAprobar = document.querySelectorAll('.form-aprobar');
    formulariosAprobar.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            AppUtils.showConfirmationDialog({
                title: '¿Enviar a cocina?',
                text: 'Se aprobará el pedido de la carta digital y se mandará la orden a las estaciones.',
                icon: 'info',
                confirmButtonColor: '#198754',
                confirmButtonText: 'Sí, aprobar'
            }, function() {
                AppUtils.showLoading(true);
                form.submit();
            });
        });
    });

    // --- 5. ACCIONES DE CARTA DIGITAL (Rechazar con AppUtils) ---
    const formulariosRechazar = document.querySelectorAll('.form-rechazar');
    formulariosRechazar.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            AppUtils.showConfirmationDialog({
                title: '¿Rechazar comanda?',
                text: 'Esta comanda digital será cancelada y removida de la lista.',
                icon: 'warning',
                confirmButtonColor: '#dc3545',
                confirmButtonText: 'Sí, rechazar'
            }, function() {
                AppUtils.showLoading(true);
                form.submit();
            });
        });
    });

});