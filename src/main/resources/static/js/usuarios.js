$(document).ready(function () {
    let dataTable;
    let isEditing = false;
    let modal;
    
    const formId = '#form';

    const API_BASE = '/usuarios/api';
    const ENDPOINTS = {
        list: `${API_BASE}/listar`,
        save: `${API_BASE}/guardar`,
        get: (id) => `${API_BASE}/obtener/${id}`,
        delete: `${API_BASE}/eliminar`,
        profiles: `${API_BASE}/perfiles`,
        toggleStatus: (id) => `${API_BASE}/cambiar-estado/${id}`
    };

    initializeDataTable();
    modal = new bootstrap.Modal(document.getElementById('modal'));
    loadProfiles();
    setupEventListeners();

    function initializeDataTable() {
        dataTable = $('#tabla').DataTable({
            responsive: true,
            autoWidth: false, // 🌟 Clave anti-scroll horizontal
            processing: true,
            pageLength: 10,
            ajax: { url: ENDPOINTS.list, dataSrc: 'data' },
            columns: [
                { data: 'id' },
                { data: 'usuario' },
                { data: 'perfil.nombre' },
                { data: 'correo' },
                {
                    data: 'estado',
                    render: (data) => data === 1 ?
                        '<span class="badge text-bg-success">Activo</span>'
                        : '<span class="badge text-bg-danger">Inactivo</span>'
                },
                {
                    data: null, orderable: false, searchable: false,
                    render: (data, type, row) => {
                        return `
                        <div class="action-buttons-wrapper">
                            <button type="button" class="action-jama-btn btn-action-edit action-edit" data-id="${row.id}" title="Editar Usuario">
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

                            <button type="button" class="action-jama-btn btn-action-delete action-delete" data-id="${row.id}" title="Eliminar Usuario">
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
                        </div>`;
                    }
                }
            ],
            dom: "<'row pb-2 align-items-center'<'col-md-6'l><'col-md-6 d-flex justify-content-end'f>>" +
                  "<'row'<'col-sm-12'tr>>" +
                  "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
            language: {
                "processing": "Procesando...",
                "lengthMenu": "Mostrar _MENU_ registros",
                "zeroRecords": "No se encontraron resultados",
                "emptyTable": "Ningún dato disponible en esta tabla",
                "info": "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
                "infoEmpty": "Mostrando registros del 0 al 0 de un total de 0 registros",
                "infoFiltered": "(filtrado de un total de _MAX_ registros)",
                "search": "Buscar:",
                "loadingRecords": "Cargando...",
                "paginate": {
                    "first": "Primero",
                    "last": "Último",
                    "next": "Siguiente",
                    "previous": "Anterior"
                },
                "aria": {
                    "sortAscending": ": Activar para ordenar la columna de manera ascendente",
                    "sortDescending": ": Activar para ordenar la columna de manera descendente"
                }
            }
        });
    }

    function setupEventListeners() {
            // Botón nuevo registro
            $('#btnNuevoRegistro').on('click', openModalForNew);

            // Guardar formulario
            $(formId).on('submit', function (e) {
                e.preventDefault();
                saveUsuario();
            });

            // 🌟 Captura segura de botones dinámicos usando funciones anónimas de jQuery
            $('#tabla tbody').on('click', '.action-edit', function () {
                const id = $(this).data('id');
                handleEdit(id); // Pasamos el ID directamente como argumento seguro
            });

            $('#tabla tbody').on('click', '.action-status', function () {
                const id = $(this).data('id');
                handleToggleStatus(id);
            });

            $('#tabla tbody').on('click', '.action-delete', function () {
                const id = $(this).data('id');
                handleDelete(id);
            });
        }

    function reloadTable() { dataTable.ajax.reload(null, false); }

    function loadProfiles() {
        fetch(ENDPOINTS.profiles)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const select = $('#id_perfil');
                    select.empty().append('<option value="" disabled selected>Selecciona un Perfil</option>');
                    data.data.forEach(profile => select.append(`<option value="${profile.id}">${profile.nombre}</option>`));
                } else { AppUtils.showNotification('Error al cargar perfiles', 'error'); }
            }).catch(error => console.error('Error cargando perfiles:', error));
    }

    function saveUsuario() {
        limpiarErrores();
        const formData = {
            id: $('#id').val() || null,
            usuario: $('#usuario').val().trim(),
            correo: $('#correo').val().trim(),
            perfil: { id: $('#id_perfil').val() },
            clave: $('#clave').val()
        };

        AppUtils.showLoading(true);
        fetch(ENDPOINTS.save, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    modal.hide();
                    AppUtils.showNotification(data.message, 'success');
                    reloadTable();
                } else {
                    if (data.errors) {
                        Object.keys(data.errors).forEach(field => $(`#${field}-error`).text(data.errors[field]));
                    } else { AppUtils.showNotification(data.message, 'error'); }
                }
            })
            .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
            .finally(() => AppUtils.showLoading(false));
    }

    function handleEdit(id) { // 👈 Ahora recibe el ID directamente, sin depender de '$(this)'
            AppUtils.showLoading(true);
            fetch(`${ENDPOINTS.get(id)}?t=${new Date().getTime()}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) { openModalForEdit(data.data); }
                    else { AppUtils.showNotification('Error al cargar usuario', 'error'); }
                })
                .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
                .finally(() => AppUtils.showLoading(false));
        }

    function handleToggleStatus(id) { // 👈 Recibe el ID directamente
            AppUtils.showLoading(true);
            fetch(ENDPOINTS.toggleStatus(id), { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    if (data.success) { AppUtils.showNotification(data.message, 'success'); reloadTable(); }
                    else { AppUtils.showNotification(data.message, 'error'); }
                })
                .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
                .finally(() => AppUtils.showLoading(false));
        }

    function handleDelete(id) { // 👈 Recibe el ID directamente
            Swal.fire({
                title: '¿Estás seguro?', text: "¡El usuario será marcado como eliminado!",
                icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, ¡eliminar!', cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    AppUtils.showLoading(true);
                    fetch(`${ENDPOINTS.delete}/${id}`, { method: 'DELETE' })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) { AppUtils.showNotification(data.message, 'success'); reloadTable(); }
                            else { AppUtils.showNotification(data.message, 'error'); }
                        })
                        .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
                        .finally(() => AppUtils.showLoading(false));
                }
            });
        }

    function openModalForNew() {
        isEditing = false;
        limpiarErrores();
        AppUtils.clearForm(formId);
        $('#modalTitle').text('Agregar Usuario');
        modal.show();
    }

    function openModalForEdit(usuario) {
        isEditing = true;
        limpiarErrores();
        AppUtils.clearForm(formId);
        $('#modalTitle').text('Editar Usuario');
        $('#id').val(usuario.id);
        $('#usuario').val(usuario.usuario);
        $('#correo').val(usuario.correo);
        $('#id_perfil').val(usuario.perfil ? usuario.perfil.id : '');
        $('#id_perfil').prop('disabled', false);
        $('#clave').val('');

        modal.show();
    }

    function limpiarErrores() { $('.invalid-feedback').text(''); }
});