// ========================================================
// 🛡️ ESCUDO PERIMETRAL GLOBAL DE LA JAMA (CANAL HÍBRIDO)
// ========================================================

// 1. Silencia de golpe el cartel de advertencia rústico en TODOS los DataTables del sistema
if (typeof $ !== 'undefined' && $.fn.dataTable) {
    $.fn.dataTable.ext.errMode = 'throw';
}

// ========================================================
// 🛡️ ADUANA GLOBAL DE CONTROL HORARIO POR TURNO (BLINDADA)
// ========================================================
$(document).ready(function () {

    // Escuchamos CUALQUIER clic en botones operativos, enlaces del sidebar, tablas o acciones
    $(document).on('click', 'button, input[type="submit"], .action-jama-btn, .btn-mesa, #btnEnviarCocina, #sidebar a, a.dynamic-link', function (e) {

        // 1. Excepciones obvias: Permitir siempre cerrar sesión o ver el perfil propio
        if (this.id === 'btnLogout' || this.href?.includes('/logout') || this.href?.includes('/MiPerfil')) {
            return true;
        }

        // 2. 👑 PASAPORTE DE PRIVILEGIOS ATÓMICO (BYPASS):
        // Si las variables inyectadas por el layout determinan rango de administración,
        // el escudo se apaga por completo al instante, permitiendo el acceso 24/7.
        if (window.esSuperAdmin === true || window.esAdmin === true) {
            return true;
        }

        // 3. Control horario restrictivo para personal de planilla ordinario
        const turnoActualSesion = window.turnoUsuarioLogueado;

        if (!verificarTurnoOperativo(turnoActualSesion)) {
            e.preventDefault();
            e.stopPropagation(); // Congela redirecciones dinámicas y flujos visuales

            if (typeof AppUtils !== 'undefined' && typeof AppUtils.showNotification === 'function') {
                AppUtils.showNotification("🚫 Operación denegada: Te encuentras fuera de tu turno de trabajo asignado.", "error");
            } else {
                alert("🚫 Operación denegada: Te encuentras fuera de tu turno de trabajo asignado.");
            }
            return false;
        }
    });
});

/**
 * ⏰ MOTOR DE CÁLCULO HORARIO INTERNO
 * Evalúa si la hora actual de la máquina concuerda con las ventanas del restaurante.
 */
function verificarTurnoOperativo(turnoUsuario) {
    if (!turnoUsuario) return true; // Si es Administrador global sin turno asignado, pasa libre

    const horaActual = new Date().getHours();
    const minutosActuales = new Date().getMinutes();
    const tiempoEnMinutos = (horaActual * 60) + minutosActuales;

    // Constantes operativas de La Jama convertidas a minutos absolutos
    const inicioDia = 8 * 60;    // 08:00 AM
    const finDia    = 18 * 60;   // 06:00 PM
    const inicioNoche = 19 * 60;  // 07:00 PM
    const finNoche    = 7 * 60;   // 07:00 AM (Del día siguiente)

    if (turnoUsuario.toUpperCase() === 'DIA') {
        return (tiempoEnMinutos >= inicioDia && tiempoEnMinutos <= finDia);
    }

    if (turnoUsuario.toUpperCase() === 'NOCHE') {
        // Al cruzar la medianoche, el rango es válido de 19:00 a 23:59 ó de 00:00 a 07:00
        return (tiempoEnMinutos >= inicioNoche || tiempoEnMinutos <= finNoche);
    }

    return true;
}

// 3. ADUANA GLOBAL PARA JQUERY (El salvavidas para los otros módulos con DataTables)
$(document).ajaxError(function (event, xhr, settings) {
    if (xhr.status === 429) {
        ejecutarAlertaRateLimit();

        // Frenamos cualquier manejo de error posterior para que no salten alertas rústicas
        event.preventDefault();
        event.stopPropagation();
    }
});

// 4. ADUANA GLOBAL PARA FETCH NATIVO (Módulos modernos)
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
    try {
        let response = await originalFetch(...args);

        if (response.status === 429) {
            ejecutarAlertaRateLimit();

            const errorCustom = new Error("RateLimitBlock");
            errorCustom.isJamaSecure = true;
            throw errorCustom;
        }

        return response;
    } catch (err) {
        throw err;
    }
};

// 5. Inyector unificado de notificaciones flotantes premium
function ejecutarAlertaRateLimit() {
    if (typeof AppUtils !== 'undefined' && AppUtils.showNotification) {
        AppUtils.showNotification("🚨 ¡Baje el ritmo!", "error");
    } else {
        alert("🚨 Sistema saturado. Por favor, espera un momento antes de continuar.");
    }
}