// === CONEXIÓN WEBSOCKET PARA ALERTAS DE MERMA EN TIEMPO REAL ===
var socket = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Monitor de Barra Fría Conectado: ' + frame);
    stompClient.subscribe('/topic/notificaciones', function (notificacion) {
        procesarAlertaCocina(notificacion.body);
    });
});

function procesarAlertaCocina(mensaje) {
    if (mensaje.includes("🚨 ALERTA DE MERMA")) {
        // Alarma ruidosa y visual para detener preparaciones en frío
        var audioAlarma = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
        audioAlarma.play().catch(e => console.log("Sonido bloqueado por directiva de navegador"));

        Swal.fire({
            icon: 'error',
            title: '¡DETENER PREPARACIÓN!',
            text: mensaje,
            background: '#fff3f3',
            color: '#dc3545',
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'ENTENDIDO / LEÍDO',
            allowOutsideClick: false
        }).then(() => {
            window.location.reload();
        });
    }
}

// === CRONÓMETROS Y LOGÍSTICA ===
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

        // Alerta visual de retraso en preparaciones frías (> 10 min)
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
                title: '¿Despachar de Barra Fría?',
                text: `¿Confirmas que toda la orden fría (ensaladas/bebidas) del Pedido #${pedidoId} está lista para salir?`,
                icon: 'question',
                confirmButtonColor: '#0dcaf0',
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
            // Solo recargamos si el botón estaba palpitando (tenía cosas NUEVAS)
            if (this.classList.contains('btn-alerta-ticket')) {
                this.innerHTML = '<i class="bi bi-hourglass-split me-2"></i> Procesando...';
                this.classList.remove('btn-info', 'btn-alerta-ticket');
                this.classList.add('btn-secondary');

                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        });
    });

    // Auto-recarga inteligente (ignorada si hay modal abierto)
    setInterval(() => {
        if (!Swal.isVisible()) {
            console.log("Sincronizando monitor de barra fría en background...");
            location.reload();
        }
    }, 45000);
});

// =========================================================================
// 🔥 CONTROL MICROSCOPIO: DESPACHAR PLATO INDIVIDUAL FRÍO RE-CALIBRADO
// =========================================================================
function despacharItemCocina(pedidoId, detalleId, nombrePlato, elementoBoton) {
    // 🛡️ CANDADO DE SEGURIDAD EN FRÍO: Bloqueo inmediato para evitar doble procesamiento
    if (elementoBoton && (elementoBoton.disabled || elementoBoton.classList.contains('processing-jama'))) {
        return;
    }

    AppUtils.showConfirmationDialog({
        title: '¿Preparación Lista?',
        text: `¿Enviar "${nombrePlato}" al área de entrega para que el mesero lo recoja?`,
        icon: 'question',
        confirmButtonColor: '#0dcaf0',
        confirmButtonText: 'Sí, despachar'
    }, async function() {
        AppUtils.showLoading(true);

        // 🔒 Congelamos físicamente el botón en la barra fría
        if (elementoBoton) {
            elementoBoton.disabled = true;
            elementoBoton.classList.add('processing-jama');
            elementoBoton.innerHTML = '<i class="bi bi-hourglass-split"></i>';
        }

        const params = new URLSearchParams();
        params.append("pedidoId", pedidoId);
        params.append("detalleId", detalleId);
        params.append("tipoEstacion", "fria");

        try {
            const res = await fetch('/admin/cocina/completar-item', {
                method: 'POST',
                body: params
            });
            if (res.ok) {
                // 🚀 SOLUCIÓN ASÍNCRONA: Respiro de consolidación para la BD de La Jama
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            } else {
                // Liberación de emergencia del control de barra
                if (elementoBoton) {
                    elementoBoton.disabled = false;
                    elementoBoton.classList.remove('processing-jama');
                    elementoBoton.innerHTML = '<i class="bi bi-check2-all"></i> Despachar';
                }
                AppUtils.showLoading(false);
                AppUtils.showNotification("Error al despachar la preparación", "error");
            }
        } catch (error) {
            if (elementoBoton) {
                elementoBoton.disabled = false;
                elementoBoton.classList.remove('processing-jama');
            }
            AppUtils.showLoading(false);
            console.error("Error en la petición asíncrona de barra fría:", error);
        }
    });
}