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
            autoWidth: false, // 🌟 Desactivamos anchos fijos para evitar micro-scrolls
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
        // 🌟 INTEGRACIÓN DE COMPONENTES CRUD CINÉTICOS Y MICRO-INTERACTIVOS
        return `
            <div class="action-buttons-wrapper">
                <button type="button" class="action-jama-btn btn-action-edit action-edit" data-id="${row.id}" title="Editar Perfil">
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

                <button type="button" class="action-jama-btn btn-action-permissions action-permissions" data-id="${row.id}" title="Asignar Permisos">
                    <i class="bi bi-key-fill key-icon"></i>
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

                <button type="button" class="action-jama-btn btn-action-delete action-delete" data-id="${row.id}" title="Eliminar Perfil">
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
            AppUtils.showNotification('El nombre es obligatorio', 'error');
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

// ── 1. CARGAR PERMISOS (CON COPILOTO DE VERIFICACIÓN) ────────────────
    async function handlePermissions(e) {
        const id = $(this).data('id');
        AppUtils.showLoading(true);
        $('#permisoPerfilId').val(id);

        try {
            // Forzamos la petición al backend para traer los datos más frescos
            const [perfilRes, opcionesRes] = await Promise.all([
                fetch(`${ENDPOINTS.get(id)}?t=${new Date().getTime()}`), // Evita caché de navegador
                fetch(ENDPOINTS.options)
            ]);

            const perfilData = await perfilRes.json();
            const opcionesData = await opcionesRes.json();

            if (perfilData.success && opcionesData.success) {
                $('#permisoPerfilNombre').text(perfilData.data.nombre);
                const listaOpciones = $('#listaOpciones');
                listaOpciones.empty();

                // Extraemos los IDs activos en un array plano para que la comparación sea ultra rápida y segura
                const opcionesActivasIds = perfilData.data.opciones ?
                    perfilData.data.opciones.map(op => parseInt(op.id || op)) : [];

                opcionesData.data.forEach(opcion => {
                    // Copiloto de seguridad: Compara si el ID de la opción general está en el mapa del perfil
                    const isChecked = opcionesActivasIds.includes(parseInt(opcion.id));

                    const item = `
                        <label class="list-group-item d-flex align-items-center gap-3 p-3" style="cursor: pointer;">
                            <input class="form-check-input m-0" type="checkbox" value="${opcion.id}" ${isChecked ? 'checked' : ''}>
                            <span class="text-dark fw-semibold" style="font-size: 0.95rem;">${opcion.nombre}</span>
                        </label>
                    `;
                    listaOpciones.append(item);
                });
                permisosModal.show();
            } else {
                AppUtils.showNotification('Error al cargar datos de permisos', 'error');
            }
        } catch (error) {
            console.error("Error cargando permisos:", error);
            AppUtils.showNotification('Error de conexión al cargar permisos', 'error');
        } finally {
            AppUtils.showLoading(false);
        }
    }

    // ── 2. GUARDAR PERMISOS (MAPEADO DE RELACIÓN SEGURO) ────────────────
    async function savePermissions() {
        const perfilId = $('#permisoPerfilId').val();

        // Obtenemos los checkboxes seleccionados en el formato de entidad que Spring Boot espera
        const selectedOpciones = $('#listaOpciones input:checked').map(function () {
            return {
                id: parseInt($(this).val())
            };
        }).get();

        AppUtils.showLoading(true);
        try {
            // 1. Traemos el estado del perfil para no pisar campos como el "estado" o la "descripción"
            const perfilRes = await fetch(ENDPOINTS.get(perfilId));
            const perfilData = await perfilRes.json();

            if (!perfilData.success) {
                AppUtils.showNotification('No se pudo obtener el perfil para actualizar', 'error');
                return;
            }

            const perfilToUpdate = perfilData.data;

            // 2. Inyectamos la nueva colección de opciones seleccionadas
            perfilToUpdate.opciones = selectedOpciones;

            // 3. Enviamos la actualización al controlador de Spring
            const saveRes = await fetch(ENDPOINTS.save, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(perfilToUpdate)
            });
            const saveData = await saveRes.json();

            if (saveData.success) {
                permisosModal.hide();
                AppUtils.showNotification('Permisos actualizados correctamente', 'success');

                // 🌟 CLAVE DE PERSISTENCIA: Recargamos la tabla para refrescar los objetos en memoria del DOM
                reloadTable();
            } else {
                AppUtils.showNotification(saveData.message || 'Error al guardar permisos', 'error');
            }
        } catch (error) {
            console.error("Error guardando permisos:", error);
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