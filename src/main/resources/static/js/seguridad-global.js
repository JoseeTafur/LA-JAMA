// ========================================================
// 🛡️ ESCUDO PERIMETRAL GLOBAL DE LA JAMA (CANAL HÍBRIDO)
// ========================================================

// 1. Silencia de golpe el cartel de advertencia rústico en TODOS los DataTables del sistema
if (typeof $ !== 'undefined' && $.fn.dataTable) {
    $.fn.dataTable.ext.errMode = 'throw';
}

// 2. ADUANA GLOBAL PARA JQUERY (El salvavidas para los otros módulos con DataTables)
$(document).ajaxError(function (event, xhr, settings) {
    if (xhr.status === 429) {
        ejecutarAlertaRateLimit();

        // Frenamos cualquier manejo de error posterior para que no salten alertas rústicas
        event.preventDefault();
        event.stopPropagation();
    }
});

// 3. ADUANA GLOBAL PARA FETCH NATIVO (Módulos modernos)
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

// 4. Inyector unificado de notificaciones flotantes premium
function ejecutarAlertaRateLimit() {
    if (typeof AppUtils !== 'undefined' && AppUtils.showNotification) {
        AppUtils.showNotification("🚨 ¡Baje el ritmo!", "error");
    } else {
        alert("🚨 Sistema saturado. Por favor, espera un momento antes de continuar.");
    }
}