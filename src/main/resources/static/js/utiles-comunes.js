// ========================================================
// MÓDULO GLOBAL DE UTILITARIOS (APPUTILS)
// ========================================================
window.AppUtils = (function () { // 👈 Cambiado de "const AppUtils" a "window.AppUtils"
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

    // Inyección dinámica de tus 7 bloques geométricos en cascada (Para procesos CRUD internos)
    // Modifica únicamente esta sección dentro de tu AppUtils de utiles-comunes.js
    function showLoading(show) {
        const overlayId = 'crud-loading-overlay'; // ID único para operaciones CRUD internos
        if (show) {
            if ($(`#${overlayId}`).length === 0) {
                $('body').append(`
                    <div id="${overlayId}" class="loading-overlay" style="
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(6, 10, 8, 0.94); z-index: 99999; /* Mayor z-index */
                        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2rem;">

                        <div class="loader">
                            <div class="loader-square"></div>
                            <div class="loader-square"></div>
                            <div class="loader-square"></div>
                            <div class="loader-square"></div>
                            <div class="loader-square"></div>
                            <div class="loader-square"></div>
                            <div class="loader-square"></div>
                        </div>

                        <p style="color: #fed7aa; font-size: 1.1rem; font-weight: 600; letter-spacing: 1px; margin: 0; font-family: system-ui, sans-serif;">
                            Procesando solicitud...
                        </p>
                    </div>
                `);
            }
        } else {
            $(`#${overlayId}`).remove();
        }
    }

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