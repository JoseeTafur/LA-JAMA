
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

    // ── DataTable ────────────────────────────────────────────
    function initializeDataTable() {
        dataTable = $('#tabla').DataTable({
            responsive: true,
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
                        ? '<span class="badge text-bg-warning">☀️ Día</span>'
                        : '<span class="badge text-bg-info text-dark">🌙 Noche</span>'
                },
                {
                    data: 'tipoContrato',
                    render: (d) => d === 'PLANILLA'
                        ? '<span class="badge text-bg-primary">Planilla</span>'
                        : '<span class="badge text-bg-secondary">Eventual</span>'
                },
                {
                    data: 'estado',
                    render: (d) => d === 1
                        ? '<span class="badge text-bg-success">Activo</span>'
                        : '<span class="badge text-bg-danger">Inactivo</span>'
                },
                {
                    data: null, orderable: false, searchable: false,
                    render: (data, type, row) => AppUtils.createActionButtons(row)
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
            }
        });
    }

    // ── Cargar cargos en select ───────────────────────────
    function cargarCargos() {
        const select = $('#id_cargo');

        $.get(ENDPOINTS.cargos)
            .done(function (res) {
                console.log("Datos recibidos de cargos:", res); // Esto es para que verifiques en consola
                if (res.success && res.data) {
                    select.empty().append('<option value="">-- Seleccione cargo --</option>');
                    res.data.forEach(c => {
                        select.append(`<option value="${c.id}">${c.nombre}</option>`);
                    });
                }
            })
            .fail(function (error) {
                console.error("Error al cargar cargos de La Jama:", error);
                select.empty().append('<option value="">Error al cargar</option>');
            });
    }

    function cargarUsuariosDisponibles() {
        $.get(ENDPOINTS.usuarios, function (res) {
            if (!res.success) return;
            const select = $('#id_usuario');

            // Limpiamos y ponemos la opción por defecto
            select.empty().append('<option value="">-- Sin acceso (Solo personal) --</option>');

            res.data.forEach(u => {
                // Mostramos el login y el correo entre paréntesis para identificarlo bien
                const infoUsuario = `${u.usuario} (${u.correo})`;
                select.append(`<option value="${u.id}">${infoUsuario}</option>`);
            });
        });
    }

    // ── Eventos ──────────────────────────────────────────
    function setupEventListeners() {

        // Botón nuevo
        $('#btnNuevoRegistro').on('click', function () {
            isEditing = false;
            $('#modalTitle').text('Agregar Empleado');
            AppUtils.clearForm(formId);
            modal.show();
        });

        // Filtro por turno
        $('#filtroTurno').on('change', function () {
            const turno = $(this).val();
            const url = turno ? `${ENDPOINTS.buscar}?turno=${turno}` : ENDPOINTS.list;
            dataTable.ajax.url(url).load();
        });

        // Guardar (submit form)
        $('#form').on('submit', function (e) {
            e.preventDefault();
            guardarEmpleado();
        });

        // Editar
        $('#tabla').on('click', '.action-edit', function () {
            const id = $(this).data('id');
            editarEmpleado(id);
        });

        // Cambiar estado
        $('#tabla').on('click', '.action-status', function () {
            const id = $(this).data('id');
            AppUtils.showConfirmationDialog(
                { title: '¿Cambiar estado?', text: 'Se alternará el estado del empleado.', icon: 'question', confirmButtonColor: '#f59e0b' },
                () => cambiarEstado(id)
            );
        });

        // Eliminar
        $('#tabla').on('click', '.action-delete', function () {
            const id = $(this).data('id');
            AppUtils.showConfirmationDialog(
                { title: '¿Eliminar empleado?', text: 'Esta acción no se puede deshacer.', icon: 'warning' },
                () => eliminarEmpleado(id)
            );
        });
    }

    // ── CRUD ──────────────────────────────────────────────

    function guardarEmpleado() {
        limpiarErrores();

        const idVal   = $('#id').val();
        const usuarioId = $('#id_usuario').val();
        const cargoId = $('#id_cargo').val();

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

        // Validaciones frontend
        let hayError = false;
        if (!payload.nombre) { mostrarError('nombre-error', 'El nombre es obligatorio'); hayError = true; }
        if (!payload.apellido) { mostrarError('apellido-error', 'El apellido es obligatorio'); hayError = true; }
        if (payload.dni && payload.dni.length !== 8) { mostrarError('dni-error', 'El DNI debe tener 8 dígitos'); hayError = true; }
        if (hayError) return;

        AppUtils.showLoading(true);

        $.ajax({
            url:         ENDPOINTS.save,
            method:      'POST',
            contentType: 'application/json',
            data:        JSON.stringify(payload),
            success: function (res) {
                AppUtils.showLoading(false);
                if (res.success) {
                    modal.hide();
                    dataTable.ajax.reload(null, false);
                    AppUtils.showNotification(res.message, 'success');
                } else {
                    AppUtils.showNotification(res.message || 'Error al guardar', 'error');
                }
            },
            error: function (xhr) {
                AppUtils.showLoading(false);
                const msg = xhr.responseJSON?.message || 'Error al guardar el empleado';
                AppUtils.showNotification(msg, 'error');
            }
        });
    }

    function editarEmpleado(id) {
        AppUtils.showLoading(true);
        $.get(ENDPOINTS.get(id), function (res) {
            AppUtils.showLoading(false);
            if (!res.success) { AppUtils.showNotification('No se pudo cargar el empleado', 'error'); return; }

            isEditing = true;
            const e = res.data;
            AppUtils.clearForm(formId);

            $('#modalTitle').text('Editar Empleado');
            $('#id').val(e.id);
            $('#nombre').val(e.nombre);
            $('#apellido').val(e.apellido);
            $('#dni').val(e.dni);
            $('#correo').val(e.correo);
            $('#telefono').val(e.telefono);
            $('#turno').val(e.turno);
            $('#tipoContrato').val(e.tipoContrato);
            $('#fechaIngreso').val(e.fechaIngreso);
            if (e.cargo) $('#id_cargo').val(e.cargo.id);
            if (e.usuario) $('#id_usuario').val(e.usuario.id);

            modal.show();
        }).fail(function () {
            AppUtils.showLoading(false);
            AppUtils.showNotification('Error al cargar empleado', 'error');
        });
    }

    function cambiarEstado(id) {
        $.post(ENDPOINTS.toggleStatus(id), function (res) {
            if (res.success) {
                dataTable.ajax.reload(null, false);
                AppUtils.showNotification(res.message, 'success');
            } else {
                AppUtils.showNotification(res.message, 'error');
            }
        }).fail(function () {
            AppUtils.showNotification('Error al cambiar estado', 'error');
        });
    }

    function eliminarEmpleado(id) {
        $.ajax({
            url:    ENDPOINTS.delete(id),
            method: 'DELETE',
            success: function (res) {
                if (res.success) {
                    dataTable.ajax.reload(null, false);
                    AppUtils.showNotification(res.message, 'success');
                } else {
                    AppUtils.showNotification(res.message, 'error');
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON?.message || 'Error al eliminar';
                AppUtils.showNotification(msg, 'error');
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────
    function mostrarError(elementId, mensaje) {
        $(`#${elementId}`).text(mensaje);
    }

    function limpiarErrores() {
        $('.invalid-feedback').text('');
    }
});
