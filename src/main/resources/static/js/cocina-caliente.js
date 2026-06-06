// === CONEXIÓN WEBSOCKET PARA ALERTAS DE MERMA EN TIEMPO REAL ===
var socket = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Monitor de Cocina Conectado: ' + frame);
    stompClient.subscribe('/topic/notificaciones', function (notificacion) {
        procesarAlertaCocina(notificacion.body);
    });
});

function procesarAlertaCocina(mensaje) {
    if (mensaje.includes("🚨 ALERTA DE MERMA")) {
        // Alarma ruidosa y visual para detener sartenes de forma inmediata
        var audioAlarma = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
        audioAlarma.play().catch(e => console.log("Sonido bloqueado por directiva de navegador"));

        Swal.fire({
            icon: 'error',
            title: '¡DETENER PRODUCCIÓN!',
            text: mensaje,
            background: '#fff3f3',
            color: '#dc3545',
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'ENTENDIDO / LEÍDO',
            allowOutsideClick: false
        }).then(() => {
            // Recargamos el monitor para limpiar el plato mermado y actualizar la UI asíncronamente
            window.location.reload();
        });
    }
}

// === CRONÓMETROS Y LOGÍSTICA ORIGINAL ===
function updateTimers() {
    document.querySelectorAll('.timer-container').forEach(container => {
        const startAttr = container.getAttribute('data-start');
        if (!startAttr) return;

        const startTime = new Date(startAttr);
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);

        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');

        const display = container.querySelector('.timer-display');
        if (display) display.innerText = `${mins}:${secs}`;

        if (diff > 600) {
            container.classList.add('timer-urgent');
        } else {
            container.classList.remove('timer-urgent');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateTimers, 1000);
    updateTimers();

    const formulariosDespachar = document.querySelectorAll('.form-despachar');

    formulariosDespachar.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const pedidoId = form.querySelector('input[name="pedidoId"]').value;

            AppUtils.showConfirmationDialog({
                title: '¿Despachar de Fogones?',
                text: `¿Confirmas que toda la comanda caliente de la Orden #${pedidoId} está lista para salir al salón?`,
                icon: 'question',
                confirmButtonColor: '#1B3A2C',
                confirmButtonText: 'Sí, despachar'
            }, function() {
                AppUtils.showLoading(true);
                form.submit();
            });
        });
    });

        const botonesImprimir = document.querySelectorAll('a[href^="/admin/cocina/ticket"]');

        botonesImprimir.forEach(btn => {
            btn.addEventListener('click', function() {
                // Solo recargamos si el botón estaba palpitando (tenía cosas NUEVAS por imprimir)
                if (this.classList.contains('btn-alerta-ticket')) {
                    // Cambiamos el texto del botón al instante para feedback visual del chef
                    this.innerHTML = '<i class="bi bi-hourglass-split me-2"></i> Procesando...';
                    this.classList.remove('btn-danger', 'btn-alerta-ticket');
                    this.classList.add('btn-secondary');

                    // Le damos 1.5 segundos al servidor para guardar en la BD y recargamos
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                }
            });
        });

    // Auto-recarga inteligente: Si hay un modal de merma activo, congela el reload automático para no molestar al chef
    setInterval(() => {
        if (!Swal.isVisible()) {
            console.log("Sincronizando monitor de cocina caliente en background...");
            location.reload();
        }
    }, 45000);
});

function despacharItemCocina(pedidoId, detalleId, nombrePlato) {
    AppUtils.showConfirmationDialog({
        title: '¿Plato Listo?',
        text: `¿Enviar "${nombrePlato}" a la barra para que el mesero lo recoja?`,
        icon: 'question',
        confirmButtonColor: '#198754',
        confirmButtonText: 'Sí, despachar'
    }, async function() {
        AppUtils.showLoading(true);
        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId); // <-- Ahora mandamos el ID único de la fila
        params.append("tipoEstacion", "caliente");

        try {
            const res = await fetch('/admin/cocina/completar-item', {
                method: 'POST',
                body: params
            });
            if (res.ok) {
                window.location.reload();
            } else {
                AppUtils.showLoading(false);
                AppUtils.showNotification("Error al despachar el plato", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error(error);
        }
    });
}