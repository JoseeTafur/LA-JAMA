// =========================================================================
// 🛰️ MOTOR DE PERSISTENCIA Y SEGMENTACIÓN POR ROL - LA JAMA
// =========================================================================
let memoriaNotificaciones = [];
window.ROL_USUARIO = "INVITADO"; // Se auto-configurará con la respuesta del servidor

var socketGlobal = new SockJS('/ws-restaurante');
var stompGlobal = Stomp.over(socketGlobal);
stompGlobal.debug = null;

stompGlobal.connect({}, function (frame) {
    stompGlobal.subscribe('/topic/notificaciones/mozos', function (payload) {
        procesarFlujoMensaje(payload.body, false);
    });
});

$(document).ready(function() {
    // 🌟 Recuperar historial persistente al refrescar la pantalla
    cargarNotificacionesDeBaseDatos();
});

function cargarNotificacionesDeBaseDatos() {
    fetch('/admin/notificaciones/api/listar-no-leidas')
        .then(r => r.json())
        .then(respuesta => {
            if (respuesta.success && respuesta.data) {
                window.ROL_USUARIO = respuesta.perfilActual || "INVITADO";
                memoriaNotificaciones = [];

                respuesta.data.forEach(notifDB => {
                    // Mapeamos explícitamente el ID de la tabla persistente
                    const objetoMensaje = optimizarCopiaMensaje(notifDB.mensaje, notifDB.id);
                    objetoMensaje.timestamp = new Date(notifDB.fechaCreacion);
                    memoriaNotificaciones.push(objetoMensaje);
                });

                renderizarContenidoBuzon();
            }
        })
        .catch(e => console.log("Histórico de alertas no disponible temporalmente."));
}

function optimizarCopiaMensaje(rawMsg, idDB = null) {
    let titulo = "Notificación de Sistema";
    let cuerpo = rawMsg;
    let badge = "Sistema";

    // 1. Detectar alertas de aproximación o alertas de inicio inmediato (Para el Mesero)
    if (rawMsg.includes("empezar") || rawMsg.includes("⏳") || rawMsg.includes("Coordinar espacios") || rawMsg.includes("ya empezó") || rawMsg.includes("mesas libres")) {
        titulo = rawMsg.includes("empezar") ? "⏳ Reserva por Empezar" : "📅 ¡Cliente en Camino / Llegó!";
        badge = "Salón";
        cuerpo = rawMsg.replace(/⏳|🚨|📢/g, '').trim();
    }
    // 2. Alertas de Cocina
    else if (rawMsg.includes("listo") || rawMsg.includes("barra") || rawMsg.includes("🍳")) {
        titulo = "🍳 ¡Pedido Listo en Barra!";
        badge = "Cocina";
        cuerpo = rawMsg.replace(/🍳|¡|!/g, '').trim() + ". ¡Corre antes de que se enfríe!";
    }
    // 3. Alertas de Expiración (Vencidas)
    else if (rawMsg.includes("VENCIDA") || rawMsg.includes("EXPIRADA") || rawMsg.includes("⚠️") || rawMsg.includes("vencida")) {
        titulo = "❌ Reserva Vencida / Liberada";
        badge = "Control";
        cuerpo = rawMsg.replace(/⚠️/g, '').trim();
    }

    return {
        id: idDB || 'notif-' + Date.now(),
        textoPuro: rawMsg,
        cuerpo: cuerpo,
        badge: badge,
        titulo: titulo,
        timestamp: new Date()
    };
}

function procesarFlujoMensaje(mensajeCrudo, esHistorico = false) {
    const objetoMensaje = optimizarCopiaMensaje(mensajeCrudo);

    if (memoriaNotificaciones.length > 0 && memoriaNotificaciones[0].cuerpo === objetoMensaje.cuerpo) return;

    memoriaNotificaciones.unshift(objetoMensaje);
    if (memoriaNotificaciones.length > 10) memoriaNotificaciones.pop();

    let tipo = 'success';
    let icono = 'bi-check-circle-fill';
    if (mensajeCrudo.includes("⏳") || mensajeCrudo.includes("📢") || mensajeCrudo.includes("reserva")) { tipo = 'warning'; icono = 'bi-calendar-event-fill'; }
    if (mensajeCrudo.includes("⚠️") || mensajeCrudo.includes("🚨")) { tipo = 'error'; icono = 'bi-exclamation-octagon-fill'; }

    if (!esHistorico) {
        crearToastFlotanteDOM(objetoMensaje, tipo, icono);
    }
    renderizarContenidoBuzon();
}

function crearToastFlotanteDOM(objMsg, tipo, icono) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `jama-modern-toast toast-${tipo}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="bi ${icono}"></i></div>
        <div class="toast-content">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold" style="font-size: 0.85rem; color: #1e3a2b;">${objMsg.titulo}</span>
                <span class="badge-jama-mini">${objMsg.badge}</span>
            </div>
            <p class="toast-message" style="font-weight: 500; font-size: 0.8rem; color: #4a5568;">${objMsg.cuerpo}</p>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 50);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 6500);
}

function calcularTiempoRelativo(fecha) {
    const difSegundos = Math.floor((new Date() - fecha) / 1000);
    if (difSegundos < 10) return 'Ahora mismo';
    if (difSegundos < 60) return `Hace ${difSegundos} seg`;
    const difMinutos = Math.floor(difSegundos / 60);
    return `Hace ${difMinutos} min`;
}

function alternarDespliegueBuzon() {
    const popover = document.getElementById('popoverNotificaciones');
    if (!popover) return;

    popover.classList.remove('d-none');
    popover.classList.toggle('visible');

    if (popover.classList.contains('visible')) {
        const badge = document.getElementById('contador-notif-buzon');
        if (badge) badge.classList.add('d-none');
        renderizarContenidoBuzon();
    }
}

function renderizarContenidoBuzon() {
    const cuerpo = document.getElementById('cuerpo-micro-notificaciones');
    const badge = document.getElementById('contador-notif-buzon');
    const popover = document.getElementById('popoverNotificaciones');
    if (!cuerpo) return;

    cuerpo.innerHTML = "";

    if (memoriaNotificaciones.length === 0) {
        cuerpo.innerHTML = `
            <div class="text-center text-muted py-5 animate__animated animate__fadeIn">
                <i class="bi bi-chat-heart d-block fs-2 mb-2" style="color: #cbd5e1;"></i>
                <p class="small fw-semibold m-0" style="color: #94a3b8;">¡Todo en orden en el salón!</p>
                <span style="font-size: 0.7rem; color: #cbd5e1;">Sin alertas del turno pendientes</span>
            </div>`;
        if (badge) badge.classList.add('d-none');
        return;
    }

    let timelineHTML = '<div class="jama-timeline">';

    memoriaNotificaciones.forEach((msg) => {
        let claseItem = 'item-success';
        let iconNode = '<i class="bi bi-dot"></i>';
        if (msg.badge === "Salón") { claseItem = 'item-warning'; iconNode = '<i class="bi bi-calendar2-check"></i>'; }
        if (msg.badge === "Control") { claseItem = 'item-error'; iconNode = '<i class="bi bi-shield-exclamation"></i>'; }

        // 🌟 CORRECCIÓN: Usamos el identificador único msg.id en lugar del index del bucle
        timelineHTML += `
            <div class="jama-timeline-node ${claseItem}" id="nodo-timeline-${msg.id}">
                <div class="node-icon">${iconNode}</div>
                <div class="node-body position-relative">
                    <button type="button" class="btn-descarte-individual" onclick="borrarNotificacionIndividual('${msg.id}')" title="Marcar como leído">
                        <i class="bi bi-x"></i>
                    </button>
                    <div class="d-flex justify-content-between align-items-center mb-1 pe-3">
                        <span class="node-title">${msg.titulo}</span>
                        <span class="node-time">${calcularTiempoRelativo(msg.timestamp)}</span>
                    </div>
                    <p class="node-desc">${msg.cuerpo}</p>
                </div>
            </div>
        `;
    });

    timelineHTML += '</div>';
    cuerpo.innerHTML = timelineHTML;

    if (popover && !popover.classList.contains('visible') && badge) {
        badge.innerText = memoriaNotificaciones.length;
        badge.classList.remove('d-none');
    }
}

function borrarNotificacionIndividual(idNotificacion) {
    // 1. Encontrar el nodo en el DOM de inmediato para no perder la referencia visual
    const nodo = document.getElementById(`nodo-timeline-${idNotificacion}`);

    if (nodo) {
        // Ejecutamos la animación premium elástica hacia la izquierda de inmediato
        nodo.style.transform = 'translateX(-105%)';
        nodo.style.opacity = '0';
        nodo.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 1, 1)';
    }

    // 2. Si es un ID legítimo de la Base de Datos (numérico o no generado por JS), impactamos el servidor
    const idStr = String(idNotificacion);
    if (idStr && !idStr.startsWith('notif-') && idStr !== "null" && idStr !== "undefined") {

        // Disparamos el fetch al endpoint de tu controlador
        fetch(`/admin/notificaciones/api/marcar-leido-individual/${idStr}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(r => {
            if (!r.ok) console.log("⚠️ Error en la respuesta del servidor al archivar.");
        })
        .catch(() => console.log("📡 Error de conexión con el repositorio de La Jama."));
    }

    // 3. Esperamos a que la animación termine (350ms) para limpiar la memoria local y re-renderizar
    setTimeout(() => {
        // Filtramos de la memoria local usando comparación limpia en string
        memoriaNotificaciones = memoriaNotificaciones.filter(n => String(n.id) !== idStr);

        // Volvemos a pintar el buzón con los datos actualizados
        renderizarContenidoBuzon();

        // Actualizamos el contador flotante exterior de la campana
        const badge = document.getElementById('contador-notif-buzon');
        if (badge) {
            if (memoriaNotificaciones.length === 0) {
                badge.classList.add('d-none');
            } else {
                badge.innerText = memoriaNotificaciones.length;
            }
        }
    }, 350);
}

window.limpiarBuzonGradual = function() {
    const items = document.querySelectorAll('.jama-timeline-node');
    if (items.length === 0) return;

    items.forEach((item, index) => {
        setTimeout(() => {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.9) translateY(-10px)';
            item.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 1, 1)';

            if (index === items.length - 1) {
                setTimeout(() => {
                    fetch('/admin/notificaciones/api/marcar-leido', { method: 'POST' })
                        .then(() => {
                            memoriaNotificaciones = [];
                            renderizarContenidoBuzon();
                        });
                }, 300);
            }
        }, index * 60);
    });
};

setInterval(() => {
    const popover = document.getElementById('popoverNotificaciones');
    if (popover && popover.classList.contains('visible')) {
        renderizarContenidoBuzon();
    }
}, 30000);

window.despacharNotificacionModerna = function(msg) {
    procesarFlujoMensaje(msg, false);
};