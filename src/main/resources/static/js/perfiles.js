$(document).ready(function () {
    let dataTable;
    let isEditing = false;
    let modal;
    let permisosModal;
    const formid = '#form';

    const API_BASE = '/perfiles/api';
    const ENDPOINTS = {
        list: `${API_BASE}/listar`,
        save: `${API_BASE}/guardar`,
        get: (id) => `${API_BASE}/obtener/${id}`,
        toggleStatus: (id) => `${API_BASE}/cambiar-estado/${id}`,
        delete: (id) => `${API_BASE}/eliminar/${id}`,
        options: `${API_BASE}/opciones`
    };

    initializeDataTable();
    modal = new bootstrap.Modal(document.getElementById('modal'));
    permisosModal = new bootstrap.Modal(document.getElementById('permisosModal'));

    setupEventListeners();

    function initializeDataTable() {
        dataTable = $('#tabla').DataTable({
            responsive: true,
            processing: true,
            ajax: {
                url: ENDPOINTS.list,
                dataSrc: 'data'
            },
            columns: [
                { data: 'id' },
                { data: 'nombre' },
                { data: 'descripcion' },
                {
                    data: 'estado',
                    render: (data) => data === 1 ? '<span class="badge text-bg-success">Activo</span>' : '<span class="badge text-bg-danger">Inactivo</span>'
                },
                {
                    data: null, orderable: false, searchable: false,
                    render: (data, type, row) => createActionButtons(row)
                }
            ],
            columnDefs: [
                { responsivePriority: 1, targets: 1 },
                { responsivePriority: 2, targets: 4 },
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
            },
            pageLength: 10
        });
    }

    function createActionButtons(row) {
        const statusIcon = row.estado === 1
            ? '<i class="bi bi-eye-slash-fill"></i>'
            : '<i class="bi bi-eye-fill"></i>';

        const statusClass = row.estado === 1 ? 'btn-outline-warning action-status' : 'btn-outline-success action-status';
        const statusTitle = row.estado === 1 ? 'Desactivar' : 'Activar';

        return `
            <div class="btn-group btn-group-sm" role="group">
                <button data-id="${row.id}" class="btn btn-sm btn-info action-permissions" title="Permisos">
                    <i class="bi bi-shield"></i>
                    Permisos
                </button>
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
    function setupEventListeners() {
        $('#btnNuevoRegistro').on('click', openModalForNew);
        $(formid).on('submit', (e) => { e.preventDefault(); savePerfil(); });
        $('#tabla tbody').on('click', '.action-edit', handleEdit);
        $('#tabla tbody').on('click', '.action-status', handleToggleStatus);
        $('#tabla tbody').on('click', '.action-permissions', handlePermissions);
        $('#btnGuardarPermisos').on('click', savePermissions);
        $('#tabla tbody').on('click', '.action-delete', handleDelete);
    }

    function reloadTable() {
        dataTable.ajax.reload();
    }
    function savePerfil() {
        const perfilData = {
            id: $('#id').val() || null,
            nombre: $('#nombre').val().trim(),
            descripcion: $('#descripcion').val().trim(),
        };

        if (!perfilData.nombre) {
            showFieldError('nombre', 'El nombre es obligatorio');
            return;
        }

        AppUtils.showLoading(true);
        fetch(ENDPOINTS.save, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(perfilData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    modal.hide();
                    AppUtils.showNotification(data.message, 'success');
                    reloadTable();
                } else {
                    AppUtils.showNotification(data.message, 'error');
                }
            })
            .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
            .finally(() => AppUtils.showLoading(false));
    }

    function handleEdit(e) {
        const id = $(this).data('id');
        AppUtils.showLoading(true);
        fetch(ENDPOINTS.get(id))
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    openModalForEdit(data.data);
                } else {
                    AppUtils.showNotification('Error al cargar perfil', 'error');
                }
            })
            .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
            .finally(() => AppUtils.showLoading(false));
    }

    function handleToggleStatus(e) {
        const id = $(this).data('id');
        AppUtils.showLoading(true);
        fetch(ENDPOINTS.toggleStatus(id), { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    AppUtils.showNotification(data.message, 'success');
                    reloadTable();
                } else {
                    AppUtils.showNotification(data.message, 'error');
                }
            })
            .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
            .finally(() => AppUtils.showLoading(false));
    }

    function handleDelete(e) {
        const id = $(this).data('id');

        Swal.fire({
            title: '¿Estás seguro?',
            text: "¡No podrás revertir esta acción! Se eliminará el perfil permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, ¡eliminar!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                AppUtils.showLoading(true);
                fetch(ENDPOINTS.delete(id), {
                    method: 'DELETE'
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            AppUtils.showNotification(data.message, 'success');
                            reloadTable();
                        } else {
                            AppUtils.showNotification(data.message, 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        AppUtils.showNotification('Error de conexión al eliminar el perfil.', 'error');
                    })
                    .finally(() => {
                        AppUtils.showLoading(false);
                    });
            }
        });
    }

    async function handlePermissions(e) {
        const id = $(this).data('id');
        AppUtils.showLoading(true);
        $('#permisoPerfilId').val(id);

        try {
            const [perfilRes, opcionesRes] = await Promise.all([
                fetch(ENDPOINTS.get(id)),
                fetch(ENDPOINTS.options)
            ]);

            const perfilData = await perfilRes.json();
            const opcionesData = await opcionesRes.json();

            if (perfilData.success && opcionesData.success) {
                $('#permisoPerfilNombre').text(perfilData.data.nombre);
                const listaOpciones = $('#listaOpciones');
                listaOpciones.empty();

                opcionesData.data.forEach(opcion => {
                    const isChecked = perfilData.data.opciones.includes(opcion.id);
                    const item = `
                        <label class="list-group-item">
                            <input class="form-check-input me-1" type="checkbox" value="${opcion.id}" ${isChecked ? 'checked' : ''}>
                            ${opcion.nombre}
                        </label>
                    `;
                    listaOpciones.append(item);
                });
                permisosModal.show();
            } else {
                AppUtils.showNotification('Error al cargar datos de permisos', 'error');
            }
        } catch (error) {
            AppUtils.showNotification('Error de conexión al cargar permisos', 'error');
        } finally {
            AppUtils.showLoading(false);
        }
    }

    async function savePermissions() {
        const perfilId = $('#permisoPerfilId').val();
        const selectedOpciones = $('#listaOpciones input:checked').map(function () {
            return { id: $(this).val() };
        }).get();

        AppUtils.showLoading(true);
        try {
            const perfilRes = await fetch(ENDPOINTS.get(perfilId));
            const perfilData = await perfilRes.json();

            if (!perfilData.success) {
                AppUtils.showNotification('No se pudo obtener el perfil para actualizar', 'error');
                return;
            }

            const perfilToUpdate = perfilData.data;
            perfilToUpdate.opciones = selectedOpciones;

            const saveRes = await fetch(ENDPOINTS.save, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(perfilToUpdate)
            });
            const saveData = await saveRes.json();

            if (saveData.success) {
                permisosModal.hide();
                AppUtils.showNotification('Permisos actualizados correctamente', 'success');
            } else {
                AppUtils.showNotification(saveData.message || 'Error al guardar permisos', 'error');
            }
        } catch (error) {
            AppUtils.showNotification('Error de conexión al guardar permisos', 'error');
        } finally {
            AppUtils.showLoading(false);
        }
    }

    function openModalForNew() {
        isEditing = false;
        AppUtils.clearForm(formid);
        $('#modalTitle').text('Agregar Perfil');
        modal.show();
    }

    function openModalForEdit(perfil) {
        isEditing = true;
        AppUtils.clearForm(formid);
        $('#modalTitle').text('Editar Perfil');
        $('#id').val(perfil.id);
        $('#nombre').val(perfil.nombre);
        $('#descripcion').val(perfil.descripcion);
        modal.show();
    }
});