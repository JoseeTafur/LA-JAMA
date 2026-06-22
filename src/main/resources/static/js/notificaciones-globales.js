// =========================================================================
// 🛰️ MOTOR DE PERSISTENCIA, WEBSOCKET Y APPIUTILS INTEGRADO - LA JAMA V4
// =========================================================================
let memoriaNotificaciones = [];
window.ROL_USUARIO = "INVITADO";

var socketGlobal = new SockJS('/ws-restaurante');
var stompGlobal = Stomp.over(socketGlobal);
stompGlobal.debug = null;

stompGlobal.connect({}, function (frame) {
    stompGlobal.subscribe('/topic/notificaciones/mozos', function (payload) {
        procesarFlujoMensaje(payload.body, false);
    });
});

$(document).ready(function() {
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

    if (rawMsg.includes("empezar") || rawMsg.includes("⏳") || rawMsg.includes("Coordinar espacios") || rawMsg.includes("ya empezó") || rawMsg.includes("mesas libres")) {
        titulo = rawMsg.includes("empezar") ? "⏳ Reserva por Empezar" : "📅 ¡Cliente en Camino / Llegó!";
        badge = "Salón";
        cuerpo = rawMsg.replace(/⏳|🚨|📢/g, '').trim();
    }
    else if (rawMsg.includes("listo") || rawMsg.includes("barra") || rawMsg.includes("🍳")) {
        titulo = "🍳 ¡Pedido Listo en Barra!";
        badge = "Cocina";
        cuerpo = rawMsg.replace(/🍳|¡|!/g, '').trim() + ". ¡Corre antes de que se enfríe!";
    }
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
    // ─── 🛡️ ADUANA INDESTRUCTIBLE POR ROL: EXCLUSIVIDAD ABSOLUTA PARA EL MESERO ───
    const esAlertaDeBarra = mensajeCrudo.includes("listo") || mensajeCrudo.includes("barra") || mensajeCrudo.includes("🍳");
    const rolActualSintonizado = (window.ROL_USUARIO || "").toUpperCase();

    // Si es una alerta operativa de platos listos para servir, evaluamos estrictamente quién está mirando la pantalla
    if (esAlertaDeBarra) {
        // Si el usuario actual es de Cocina, Chef, o cualquier rol que NO sea el MESERO receptor...
        if (rolActualSintonizado.includes("COCINA") || rolActualSintonizado.includes("CHEF") || !rolActualSintonizado.includes("MESERO")) {
            console.log(`🛑 [Aduana Real-Time] Alerta de barra bloqueada para el rol: ${rolActualSintonizado}. Destino exclusivo: MESERO.`);
            return; // Corta la ejecución en el acto: no se guarda en memoria local, no pinta el buzón ni lanza el AppUtils
        }
    }
    // ──────────────────────────────────────────────────────────────────────────────

    const objetoMensaje = optimizarCopiaMensaje(mensajeCrudo);

    if (memoriaNotificaciones.length > 0 && memoriaNotificaciones[0].cuerpo === objetoMensaje.cuerpo) return;

    memoriaNotificaciones.unshift(objetoMensaje);
    if (memoriaNotificaciones.length > 10) memoriaNotificaciones.pop();

    let tipo = 'success';
    if (mensajeCrudo.includes("⏳") || mensajeCrudo.includes("📢") || mensajeCrudo.includes("reserva")) { tipo = 'warning'; }
    if (mensajeCrudo.includes("⚠️") || mensajeCrudo.includes("🚨")) { tipo = 'error'; }

    // Únicamente el mesero en su tablet o terminal recibirá el aviso unificado con AppUtils
    if (!esHistorico && window.AppUtils && AppUtils.showNotification) {
        AppUtils.showNotification(`[${objetoMensaje.badge}] ${objetoMensaje.titulo}: ${objetoMensaje.cuerpo}`, tipo);
    }

    renderizarContenidoBuzon();
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
            </div>`;
    });

    timelineHTML += '</div>';
    cuerpo.innerHTML = timelineHTML;

    if (popover && !popover.classList.contains('visible') && badge) {
        badge.innerText = memoriaNotificaciones.length;
        badge.classList.remove('d-none');
    }
}

function borrarNotificacionIndividual(idNotificacion) {
    const nodo = document.getElementById(`nodo-timeline-${idNotificacion}`);

    if (nodo) {
        nodo.style.transform = 'translateX(-105%)';
        nodo.style.opacity = '0';
        nodo.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 1, 1)';
    }

    const idStr = String(idNotificacion);
    if (idStr && !idStr.startsWith('notif-') && idStr !== "null" && idStr !== "undefined") {
        fetch(`/admin/notificaciones/api/marcar-leido-individual/${idStr}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(r => {
            if (!r.ok) console.log("⚠️ Error en la respuesta del servidor al archivar.");
        })
        .catch(() => console.log("📡 Error de conexión con el repositorio de La Jama."));
    }

    setTimeout(() => {
        memoriaNotificaciones = memoriaNotificaciones.filter(n => String(n.id) !== idStr);
        renderizarContenidoBuzon();

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