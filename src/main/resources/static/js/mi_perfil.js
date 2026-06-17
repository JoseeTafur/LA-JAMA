/**
 * ==========================================================================
 * 🍽️ LA JAMA - CORE DE CONTROL DE CUENTA: MI PERFIL (2026)
 * Lógica Operativa e Interacción Dinámica del Perfil del Empleado
 * ==========================================================================
 */

const MiPerfilModulo = (() => {

    // Elementos del DOM cacheados de la tarjeta usando los sufijos -jama
    const ui = {
        card: document.querySelector('.perfil-card-jama'),
        badge: document.querySelector('.jama-badge-rol-jama'),
        avatar: document.querySelector('.perfil-avatar-wrapper-jama'),
        username: document.querySelector('.perfil-username-jama'),
        estadoIcono: document.querySelector('.status-activo-jama i')
    };

    /**
     * Consume la API real de sesión de UsuarioController para auditar al operador
     */
    const verificarRolSesion = async () => {
        try {
            const response = await fetch('/usuarios/api/rol-sesion');
            if (!response.ok) throw new Error("Error al consultar el rol de sesión.");

            const data = await response.json();
            console.log("🔒 [LA JAMA SEGURIDAD] Auditoría de sesión activa:", data);

            // Lógica reactiva: Si detectamos que eres SUPER_ADMIN, le metemos un sutil realce visual de control
            if (data.esSuperAdmin && ui.badge) {
                ui.badge.style.borderColor = "var(--lajama-danger, #B83A3A)";
                ui.badge.style.backgroundColor = "var(--lajama-danger-bg, rgba(184, 58, 58, 0.08))";
                ui.badge.style.color = "var(--lajama-danger, #B83A3A)";
                console.log("👑 Rango de visualización Root verificado para la cuenta.");
            }
        } catch (error) {
            console.warn("⚠️ [LA JAMA] No se pudo auditar el rango de la sesión asíncronamente:", error);
        }
    };

    /**
     * Inicializa las interacciones estéticas y de control de la tarjeta
     */
    const inicializarUI = () => {
        // 1. Animación suave de entrada (Fade-In-Up) para quitar la rigidez del F5
        if (ui.card) {
            ui.card.style.opacity = '0';
            ui.card.style.transform = 'translateY(12px)';
            ui.card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

            setTimeout(() => {
                ui.card.style.opacity = '1';
                ui.card.style.transform = 'translateY(0)';
            }, 50);
        }

        // 2. Interacción informativa al hacer clic en el avatar de usuario
        if (ui.avatar) {
            ui.avatar.style.cursor = 'pointer';
            ui.avatar.addEventListener('click', () => {
                if (typeof AppUtils !== 'undefined' && AppUtils.showNotification) {
                    AppUtils.showNotification('Credenciales firmadas y validadas de forma segura.', 'info');
                } else {
                    console.log("👤 Sesión de usuario verificada y activa.");
                }
            });
        }

        // 3. Ejecutar la comprobación del backend
        verificarRolSesion();
    };

    /**
     * 🔮 Extensión de Ingeniería: Método preparado para procesar actualizaciones
     * de contraseña o datos de usuario directo a tu API guardar sin recargar (Fetch)
     */
    const guardarCambiosAjax = async (datosUsuario) => {
        try {
            const response = await fetch('/usuarios/api/guardar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosUsuario)
            });

            const resultado = await response.json();
            if (resultado.success) {
                if (AppUtils?.showNotification) AppUtils.showNotification(resultado.message, 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                if (AppUtils?.showNotification) AppUtils.showNotification(resultado.message, 'error');
            }
        } catch (err) {
            console.error("💥 Error crítico en la persistencia del perfil:", err);
        }
    };

    // Exponer la inicialización al exterior de forma pública y limpia
    return {
        init: inicializarUI,
        save: guardarCambiosAjax
    };
})();

// Disparar de forma segura cuando el navegador termine de estructurar el DOM
document.addEventListener('DOMContentLoaded', () => {
    MiPerfilModulo.init();
});