// =======================================================
// CONEXIÓN WEBSOCKET PARA COCINA - websocket.js
// =======================================================
var socket      = new SockJS('/ws-restaurante');
var stompClient = Stomp.over(socket);

stompClient.connect({}, function (frame) {
    console.log('Conectado a WebSocket: ' + frame);

    stompClient.subscribe('/topic/notificaciones', function (notificacion) {
        mostrarNotificacionCocina(notificacion.body);
    });

    stompClient.subscribe('/topic/mesas/estados', function (payload) {
        const evento = JSON.parse(payload.body);
        actualizarEstadoMesaEnPlano(evento.numeroMesa, evento.nuevoEstado, evento.pedidoId, evento.pedidoEstado);
    });

    stompClient.subscribe('/topic/notificaciones/mozos', function (notificacion) {
        procesarNotificacionMozoInPlano(notificacion.body);
    });
});

function procesarNotificacionMozoInPlano(mensaje) {
    var audioNotif = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioNotif.play().catch(e => console.log("Audio en espera"));

    if (mensaje.includes("⏳") || mensaje.includes("🚨")) {
        AppUtils.showNotification(mensaje, 'warning');
    } else if (mensaje.includes("⚠️")) {
        AppUtils.showNotification(mensaje, 'error');
    } else {
        AppUtils.showNotification(mensaje, 'success');
    }

    if (typeof dataTable !== 'undefined') {
        dataTable.ajax.reload(null, false);
    }
}

function mostrarNotificacionCocina(mensaje) {
    if (mensaje.includes("🚨 ALERTA DE MERMA")) {
        var audioAlarma = new Audio('https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
        audioAlarma.play().catch(e => console.log("Sonido bloqueado"));
        AppUtils.showNotification(mensaje, 'error');
    } else {
        var audioNormal = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioNormal.play().catch(e => console.log("Sonido bloqueado"));
        AppUtils.showNotification(`📢 AVISO: ${mensaje}`, 'warning');
    }
}
