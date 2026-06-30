// ========================================================
// MÓDULO GLOBAL DE UTILITARIOS (APPUTILS)
// ========================================================
window.AppUtils = (function () {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    function showNotification(message, type = 'success') {
        Toast.fire({
            icon: type,
            title: message
        });
    }

    // 🚀 INYECCIÓN DINÁMICA PREMIUM: LOADER SVG DE ANILLOS ENLAZADOS (WHITE EDITION) - NATIVO
    function showLoading(show) {
        const overlayId = 'crud-loading-overlay';
        if (show) {
            if (!document.getElementById(overlayId)) {
                const overlay = document.createElement('div');
                overlay.id = overlayId;
                overlay.className = 'loading-overlay';
                overlay.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(6, 10, 8, 0.95); z-index: 99999;
                    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem;
                `;

                overlay.innerHTML = `
                    <style>
                        .pl { width: 6em; height: 6em; }
                        .pl__ring { animation: ringA 2s linear infinite; stroke: #ffffff; }
                        .pl__ring--b { animation-name: ringB; stroke: #ffffff; }
                        .pl__ring--c { animation-name: ringC; stroke: #ffffff; }
                        .pl__ring--d { animation-name: ringD; stroke: #ffffff; }
                        @keyframes ringA {
                            from, 4% { stroke-dasharray: 0 660; stroke-width: 20; stroke-dashoffset: -330; }
                            12% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -335; }
                            32% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -595; }
                            40%, 54% { stroke-dasharray: 0 660; stroke-width: 20; stroke-dashoffset: -660; }
                            62% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -665; }
                            82% { stroke-dasharray: 60 600; stroke-width: 30; stroke-dashoffset: -925; }
                            90%, to { stroke-dasharray: 0 660; stroke-width: 20; stroke-dashoffset: -990; }
                        }
                        @keyframes ringB {
                            from, 12% { stroke-dasharray: 0 220; stroke-width: 20; stroke-dashoffset: -110; }
                            20% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -115; }
                            40% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -195; }
                            48%, 62% { stroke-dasharray: 0 220; stroke-width: 20; stroke-dashoffset: -220; }
                            70% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -225; }
                            90% { stroke-dasharray: 20 200; stroke-width: 30; stroke-dashoffset: -305; }
                            98%, to { stroke-dasharray: 0 220; stroke-width: 20; stroke-dashoffset: -330; }
                        }
                        @keyframes ringC {
                            from { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: 0; }
                            8% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -5; }
                            28% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -175; }
                            36%, 58% { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -220; }
                            66% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -225; }
                            86% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -395; }
                            94%, to { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -440; }
                        }
                        @keyframes ringD {
                            from, 8% { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: 0; }
                            16% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -5; }
                            36% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -175; }
                            44%, 50% { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -220; }
                            58% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -225; }
                            78% { stroke-dasharray: 40 400; stroke-width: 30; stroke-dashoffset: -395; }
                            86%, to { stroke-dasharray: 0 440; stroke-width: 20; stroke-dashoffset: -440; }
                        }
                    </style>
                    <svg class="pl" width="240" height="240" viewBox="0 0 240 240">
                        <circle class="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke-width="20" stroke-dasharray="0 660" stroke-dashoffset="-330" stroke-linecap="round"></circle>
                        <circle class="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke-width="20" stroke-dasharray="0 220" stroke-dashoffset="-110" stroke-linecap="round"></circle>
                        <circle class="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke-width="20" stroke-dasharray="0 440" stroke-linecap="round"></circle>
                        <circle class="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke-width="20" stroke-dasharray="0 440" stroke-linecap="round"></circle>
                    </svg>
                `;
                document.body.appendChild(overlay);

                // Candado de seguridad para evitar congelamiento de pantalla (Fallback 8 segundos)
                setTimeout(() => {
                    const dynamicOverlay = document.getElementById(overlayId);
                    if (dynamicOverlay) dynamicOverlay.remove();
                }, 8000);
            }
        } else {
            const dynamicOverlay = document.getElementById(overlayId);
            if (dynamicOverlay) dynamicOverlay.remove();
        }
    }

    // 🛡️ REPARACIÓN DEL HISTORIAL EN CRUD
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            const dynamicOverlay = document.getElementById('crud-loading-overlay');
            if (dynamicOverlay) dynamicOverlay.remove();
        }
    });

    function createActionButtons(row) {
        const statusIcon = row.estado === 1 ? '<i class="bi bi-eye-slash-fill"></i>' : '<i class="bi bi-eye-fill"></i>';
        const statusClass = row.estado === 1 ? 'btn-outline-warning action-status' : 'btn-outline-success action-status';
        const statusTitle = row.estado === 1 ? 'Desactivar' : 'Activar';

        return `
            <div class="btn-group btn-group-sm" role="group">
                <button data-id="${row.id}" class="btn btn-outline-primary action-edit" title="Editar">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button data-id="${row.id}" class="btn ${statusClass}" title="${statusTitle}">
                    ${statusIcon}
                </button>
                <button data-id="${row.id}" class="btn btn-outline-danger action-delete" title="Eliminar">
                    <i class="bi bi-trash3-fill"></i>
                </button>
            </div>
        `;
    }

    function clearForm(formId) {
        const form = document.querySelector(formId);
        if (!form) return;

        // Limpiar inputs de texto, números, contraseñas, etc.
        form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"], input[type="email"], input[type="password"], input[type="tel"], input[type="file"], textarea').forEach(el => el.value = '');

        // Resetear selectores a índice 0
        form.querySelectorAll('select').forEach(el => {
            el.selectedIndex = 0;
            // Disparar evento nativo por si se usa alguna librería de escucha
            el.dispatchEvent(new Event('change'));
        });

        // Limpiar estados de Bootstrap de validación errónea
        form.querySelectorAll('.form-control, .form-select').forEach(el => el.classList.remove('is-invalid'));
        form.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');

        const hiddenId = form.querySelector('#id');
        if (hiddenId) hiddenId.value = '';
    }

    function showConfirmationDialog(options = {}, onConfirm) {
        const defaults = {
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esta acción!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        };
        const config = { ...defaults, ...options };
        Swal.fire(config).then((result) => {
            if (result.isConfirmed && typeof onConfirm === 'function') {
                onConfirm();
            }
        });
    }

    return {
        showNotification: showNotification,
        showLoading: showLoading,
        createActionButtons: createActionButtons,
        clearForm: clearForm,
        showConfirmationDialog: showConfirmationDialog,
    };
})();

// =========================================================================
// 🛰️ GANCHO GLOBAL: CAPTURA DE REDIRECCIÓN EN EL DASHBOARD POR RATE LIMIT
// =========================================================================
(function() {
    function verificarSaturaciónUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('error') && urlParams.get('error') === 'ratelimit') {

            if (window.AppUtils && typeof window.AppUtils.showLoading === 'function') {
                window.AppUtils.showLoading(false);
            }

            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: '¡Despacio, La Jama!',
                    text: 'Has hecho demasiadas solicitudes en un lapso de tiempo corto. Ve despacio.',
                    confirmButtonColor: '#1B3A2C'
                });
            }

            const nuevaUrl = window.location.pathname;
            window.history.replaceState({}, document.title, nuevaUrl);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', verificarSaturaciónUrl);
    } else {
        verificarSaturaciónUrl();
    }
})();

// ========================================================
// CONTROL DE SIDEBAR INTERNO (CONDICIONAL SEGURO CON JQUERY)
// ========================================================
// 🛡️ Solo se ejecuta la micro-interacción si jQuery ($) está disponible en el entorno
if (typeof $ !== 'undefined') {
    $(document).ready(function () {
        function setupSidebar() {
            const sidebar = $('#sidebar');
            const openSidebarBtn = $('#open-sidebar');
            const closeSidebarBtn = $('#close-sidebar');
            const sidebarOverlay = $('#sidebar-overlay');

            if (openSidebarBtn.length) {
                openSidebarBtn.on('click', function () {
                    sidebar.addClass('active');
                    sidebarOverlay.addClass('active');
                });

                function closeSidebar() {
                    sidebar.removeClass('active');
                    sidebarOverlay.removeClass('active');
                }

                closeSidebarBtn.on('click', closeSidebar);
                sidebarOverlay.on('click', closeSidebar);
            }
        }
        setupSidebar();
    });
}