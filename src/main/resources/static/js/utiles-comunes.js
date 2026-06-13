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

    // 🚀 INYECCIÓN DINÁMICA PREMIUM: LOADER SVG DE ANILLOS ENLAZADOS (WHITE EDITION)
    function showLoading(show) {
        const overlayId = 'crud-loading-overlay';
        if (show) {
            if ($(`#${overlayId}`).length === 0) {
                $('body').append(`
                    <div id="${overlayId}" class="loading-overlay" style="
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(6, 10, 8, 0.95); z-index: 99999;
                        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem;">

                        <style>
                            .pl {
                                width: 6em;
                                height: 6em;
                            }
                            .pl__ring {
                                animation: ringA 2s linear infinite;
                                stroke: #ffffff; /* 🌟 Todos los anillos unificados en blanco */
                            }
                            .pl__ring--b {
                                animation-name: ringB;
                                stroke: #ffffff;
                            }
                            .pl__ring--c {
                                animation-name: ringC;
                                stroke: #ffffff;
                            }
                            .pl__ring--d {
                                animation-name: ringD;
                                stroke: #ffffff;
                            }

                            /* Keyframes del motor de animación original de Nawsome */
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

                    </div>
                `);

                // Candado de seguridad para evitar congelamiento de pantalla (Fallback 8 segundos)
                setTimeout(() => {
                    $(`#${overlayId}`).remove();
                }, 8000);
            }
        } else {
            $(`#${overlayId}`).remove();
        }
    }

    // 🛡️ REPARACIÓN DEL HISTORIAL EN CRUD
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            $(`#crud-loading-overlay`).remove();
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
        $(`${formId} #id`).val('');
        $(`${formId} input[type="text"], ${formId} input[type="number"], ${formId} input[type="date"], ${formId} input[type="email"], ${formId} input[type="password"], ${formId} input[type="tel"], ${formId} input[type="file"], ${formId} textarea`).val('');
        $(`${formId} select`).prop('selectedIndex', 0).trigger('change');
        $(`${formId} .form-control, ${formId} .form-select`).removeClass('is-invalid');
        $('.invalid-feedback').text('');
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

// ========================================================
// CONTROL DE SIDEBAR INTERNO (JQUERY)
// ========================================================
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