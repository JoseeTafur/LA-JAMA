/**
 * LA JAMA — empleados.js
 * Control de planillas, aduana de cliente y captura defensiva de errores 403.
 */
$(document).ready(function () {
    let dataTable;
    let isEditing = false;
    let modal;

    const formId = '#form';
    const API_BASE = '/empleados/api';
    const ENDPOINTS = {
        list:         `${API_BASE}/listar`,
        save:         `${API_BASE}/guardar`,
        get:          (id) => `${API_BASE}/obtener/${id}`,
        delete:       (id) => `${API_BASE}/eliminar/${id}`,
        cargos:       `${API_BASE}/cargos`,
        usuarios:     `${API_BASE}/usuarios-disponibles`,
        toggleStatus: (id) => `${API_BASE}/cambiar-estado/${id}`,
        buscar:       `${API_BASE}/buscar`
    };

    initializeDataTable();
    modal = new bootstrap.Modal(document.getElementById('modal'));
    cargarCargos();
    cargarUsuariosDisponibles();
    setupEventListeners();

    function initializeDataTable() {
        dataTable = $('#tabla').DataTable({
            responsive: true,
            autoWidth: false, // 🌟 Evitamos scroll horizontal corrupto
            processing: true,
            ajax: { url: ENDPOINTS.list, dataSrc: 'data' },
            columns: [
                { data: 'id' },
                { data: null, render: (d) => `${d.apellido}, ${d.nombre}` },
                { data: 'dni', defaultContent: '-' },
                { data: 'cargo.nombre', defaultContent: '-' },
                {
                    data: 'turno',
                    render: (d) => d === 'DIA'
                        ? '<span class="badge text-bg-warning px-3 py-1 rounded-pill">☀️ Día</span>'
                        : '<span class="badge text-bg-info text-dark px-3 py-1 rounded-pill">🌙 Noche</span>'
                },
                {
                    data: 'estado',
                    render: (d) => d === 1
                        ? '<span class="badge text-bg-success px-3 py-1 rounded-pill">Activo</span>'
                        : '<span class="badge text-bg-danger px-3 py-1 rounded-pill">Inactivo</span>'
                },
                {
                    data: null, orderable: false, searchable: false,
                    render: (data, type, row) => createActionButtons(row)
                },
            ],
            dom: "<'row pb-2 align-items-center'<'col-md-6'l><'col-md-6 d-flex justify-content-end'f>>" +
                 "<'row'<'col-sm-12'tr>>" +
                 "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
            language: {
                processing:    "Procesando...",
                lengthMenu:    "Mostrar _MENU_ registros",
                zeroRecords:   "No se encontraron resultados",
                emptyTable:    "Ningún dato disponible en esta tabla",
                info:          "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
                infoEmpty:     "Mostrando registros del 0 al 0 de un total de 0 registros",
                infoFiltered:  "(filtrado de un total de _MAX_ registros)",
                search:        "Buscar:",
                loadingRecords:"Cargando...",
                paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" }
            },
            pageLength: 10
        });
    }

    function createActionButtons(row) {
        // 🌟 Conservamos intacta tu botonera cinética con animaciones complejas SVG
        return `
            <div class="action-buttons-wrapper justify-content-center">
                <button type="button" class="action-jama-btn btn-action-edit action-edit" data-id="${row.id}" title="Editar Empleado">
                    <svg viewBox="0 0 39 7" class="pencil-cap" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line y1="3.5" x2="39" y2="3.5" stroke-width="4"/>
                    </svg>
                    <svg viewBox="0 0 33 39" class="pencil-body" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 2L2 15V37H31V15L27 2H6Z" stroke-width="3"/>
                        <path d="M12 15V30" stroke-width="4" stroke="white"/>
                        <path d="M21 15V30" stroke-width="4" stroke="white"/>
                    </svg>
                    <svg viewBox="0 0 89 80" class="sparks" xmlns="http://www.w3.org/2000/svg">
                        <path d="M40 0L50 30L80 40L50 50L40 80L30 50L0 40L30 30Z"/>
                    </svg>
                </button>

                <button type="button" class="action-jama-btn btn-action-status action-status ${row.estado === 1 ? 'is-active' : ''}" data-id="${row.id}" title="Cambiar Estado">
                    <svg class="eye-lid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                    </svg>
                    <svg class="eye-pupil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <div class="eye-flash"></div>
                </button>

                <button type="button" class="action-jama-btn btn-action-delete action-delete" data-id="${row.id}" title="Eliminar Empleado">
                    <svg viewBox="0 0 39 7" class="bin-top" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line y1="5" x2="39" y2="5" stroke-width="4"/>
                        <line x1="12" y1="1.5" x2="26" y2="1.5" stroke-width="3"/>
                    </svg>
                    <svg viewBox="0 0 33 39" class="bin-bottom" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0H33V35C33 37.2 31.2 39 29 39H4C1.8 39 0 37.2 0 35V0Z"/>
                        <path d="M12 6V29" stroke="white" stroke-width="4"/>
                        <path d="M21 6V29" stroke="white" stroke-width="4"/>
                    </svg>
                    <svg viewBox="0 0 89 80" class="garbage" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.5 10.5L37.5 15.5L42.5 11.5L51.5 12.5L68.75 0L72 11.5L79.5 12.5H88.5L87 22L68.75 31.5Z"/>
                    </svg>
                </button>
            </div>
        `;
    }

    function cargarCargos() {
        const select = $('#id_cargo');
        $.get(ENDPOINTS.cargos).done(function (res) {
            if (res.success && res.data) {
                select.empty().append('<option value="">-- Seleccione cargo --</option>');
                res.data.forEach(c => select.append(`<option value="${c.id}">${c.nombre}</option>`));
            }
        }).fail(function() {
            select.empty().append('<option value="">Error al mapear cargos</option>');
        });
    }

    function cargarUsuariosDisponibles() {
        $.get(ENDPOINTS.usuarios, function (res) {
            if (!res.success) return;
            const select = $('#id_usuario');
            select.empty().append('<option value="">-- Sin acceso (Solo personal) --</option>');
            res.data.forEach(u => select.append(`<option value="${u.id}">${u.usuario} (${u.correo})</option>`));
        });
    }

    function setupEventListeners() {
        $('#btnNuevoRegistro').on('click', function () {
            isEditing = false;
            $('#modalTitle').text('Agregar Empleado');
            AppUtils.clearForm(formId);
            modal.show();
        });

        $('#filtroTurno').on('change', function () {
            const turno = $(this).val();
            const url = turno ? `${ENDPOINTS.buscar}?turno=${turno}` : ENDPOINTS.list;
            dataTable.ajax.url(url).load();
        });

        $('#form').on('submit', function (e) { e.preventDefault(); guardarEmpleado(); });

        // Delegación de eventos jQuery limpia para filas mutables
        $('#tabla').on('click', '.action-edit', function () { editarEmpleado($(this).data('id')); });

        $('#tabla').on('click', '.action-status', function () {
            const id = $(this).data('id');
            AppUtils.showConfirmationDialog(
                { title: '¿Cambiar estado laboral?', text: 'Se alternará la disponibilidad del empleado en el sistema.', icon: 'question', confirmButtonColor: '#f59e0b' },
                () => cambiarEstado(id)
            );
        });

        $('#tabla').on('click', '.action-delete', function () {
            const id = $(this).data('id');
            eliminarEmpleado(id);
        });

        // =========================================================================
        // 🛡️ ADUANA INTERACTIVA EN TIEMPO REAL (MUDADA TOTALMENTE DESDE EL HTML)
        // =========================================================================

        // 1. Nombre y Apellido: Bloquear números, símbolos y emojis en caliente mientras digitan
        $('#nombre, #apellido').on('input', function() {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
        });

        // 2. DNI y Teléfono: Bloquear letras en caliente y forzar puros enteros peruanos
        $('#dni, #telefono').on('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '');
        });

        // 3. Calendario Defensivo: Bloquear fechas futuras e irracionales anteriores a 1950
        const inputFecha = document.getElementById('fechaIngreso');
        if (inputFecha) {
            const hoyIso = new Date().toISOString().split('T')[0];
            inputFecha.setAttribute('max', hoyIso);
            inputFecha.setAttribute('min', '1950-01-01');

            inputFecha.addEventListener('change', function() {
                const fechaSeleccionada = new Date(this.value);
                const limiteHoy = new Date();
                const limiteMinimo = new Date('1950-01-01');

                if (fechaSeleccionada > limiteHoy || fechaSeleccionada < limiteMinimo) {
                    $('#fechaIngreso-error').text('La fecha de ingreso no es válida. No puede ser futura ni anterior a 1950.');
                    this.value = '';
                } else {
                    $('#fechaIngreso-error').text('');
                }
            });
        }
    }

    function guardarEmpleado() {
        limpiarErrores();
        const idVal = $('#id').val();
        const cargoId = $('#id_cargo').val();
        const usuarioId = $('#id_usuario').val();

        const payload = {
            id:           idVal ? parseInt(idVal) : null,
            nombre:       $('#nombre').val().trim(),
            apellido:     $('#apellido').val().trim(),
            dni:          $('#dni').val().trim(),
            telefono:     $('#telefono').val().trim(),
            turno:        $('#turno').val(),
            tipoContrato: $('#tipoContrato').val(),
            fechaIngreso: $('#fechaIngreso').val() || null,
            cargo:        cargoId ? { id: parseInt(cargoId) } : null,
            usuario:      usuarioId ? { id: parseInt(usuarioId) } : null
        };

        // 🛡️ ADUANA FRONTEND UNIFICADA (Límites estrictos antes de viajar al servidor)
        let hayError = false;
        if (!payload.nombre) { mostrarError('nombre-error', 'El nombre es obligatorio.'); hayError = true; }
        if (!payload.apellido) { mostrarError('apellido-error', 'El apellido es obligatorio.'); hayError = true; }
        if (payload.dni && payload.dni.length !== 8) { mostrarError('dni-error', 'El DNI debe contener exactamente 8 dígitos.'); hayError = true; }
        if (payload.telefono && payload.telefono.length !== 9) { mostrarError('telefono-error', 'El teléfono debe contener exactamente 9 dígitos.'); hayError = true; }

        if (hayError) return;

        AppUtils.showLoading(true);
        $.ajax({
            url: ENDPOINTS.save, method: 'POST', contentType: 'application/json', data: JSON.stringify(payload),
            success: function (res) {
                AppUtils.showLoading(false);
                if (res.success) {
                    modal.hide();
                    dataTable.ajax.reload(null, false);
                    AppUtils.showNotification(res.message, 'success');
                } else { AppUtils.showNotification(res.message, 'error'); }
            },
            error: function (xhr) {
                AppUtils.showLoading(false);
                // 🌟 CAPTURA DEFENSIVA: Lee el mensaje 403 o 400 del servidor
                const errorMsg = xhr.responseJSON?.message || 'Error de privilegios al procesar la operación.';
                AppUtils.showNotification(errorMsg, 'error');
            }
        });
    }

    function editarEmpleado(id) {
        AppUtils.showLoading(true);
        $.get(ENDPOINTS.get(id), function (res) {
            AppUtils.showLoading(false);
            if (!res.success) return;

            isEditing = true;
            const e = res.data;
            AppUtils.clearForm(formId);

            $('#modalTitle').text('Editar Empleado');
            $('#id').val(e.id);
            $('#nombre').val(e.nombre);
            $('#apellido').val(e.apellido);
            $('#dni').val(e.dni);
            $('#telefono').val(e.telefono);
            $('#turno').val(e.turno);
            $('#tipoContrato').val(e.tipoContrato);
            $('#fechaIngreso').val(e.fechaIngreso);
            if (e.cargo) $('#id_cargo').val(e.cargo.id);
            if (e.usuario) $('#id_usuario').val(e.usuario.id);

            modal.show();
        }).fail(function (xhr) {
            AppUtils.showLoading(false);
            const errorMsg = xhr.responseJSON?.message || 'No se pudo cargar la ficha del empleado.';
            AppUtils.showNotification(errorMsg, 'error');
        });
    }

    function cambiarEstado(id) {
        AppUtils.showLoading(true);
        $.post(ENDPOINTS.toggleStatus(id), function (res) {
            AppUtils.showLoading(false);
            if (res.success) {
                dataTable.ajax.reload(null, false);
                AppUtils.showNotification(res.message, 'success');
            } else {
                AppUtils.showNotification(res.message, 'error');
            }
        }).fail(function (xhr) {
            AppUtils.showLoading(false);
            // 🌟 CAPTURA DEFENSIVA 403: Muestra la alerta de SweetAlert si el ADMIN intenta cambiar estado
            const errorMsg = xhr.responseJSON?.message || 'Acceso denegado: Rango insuficiente para suspender personal.';
            AppUtils.showNotification(errorMsg, 'error');
        });
    }

    function eliminarEmpleado(id) {
        AppUtils.showConfirmationDialog(
            { title: '¿Remover empleado de planilla?', text: 'Esta acción purgará los registros de forma permanente.', icon: 'warning' },
            () => {
                AppUtils.showLoading(true);
                $.ajax({
                    url: ENDPOINTS.delete(id), method: 'DELETE',
                    success: function (res) {
                        AppUtils.showLoading(false);
                        if (res.success) {
                            dataTable.ajax.reload(null, false);
                            AppUtils.showNotification(res.message, 'success');
                        } else {
                            AppUtils.showNotification(res.message, 'error');
                        }
                    },
                    error: function (xhr) {
                        AppUtils.showLoading(false);
                        // 🌟 CAPTURA DEFENSIVA 403: Muestra la alerta si el ADMIN intenta borrar físicamente una fila
                        const errorMsg = xhr.responseJSON?.message || 'Acceso denegado: Privilegio exclusivo de la cuenta SUPER_ADMIN.';
                        AppUtils.showNotification(errorMsg, 'error');
                    }
                });
            }
        );
    }

    function mostrarError(elementId, mensaje) { $(`#${elementId}`).text(mensaje); }
    function limpiarErrores() { $('.invalid-feedback').text(''); }
});