/**
 * LA JAMA — perfiles.js
 * Gestión de roles, micro-interacciones cinéticas y matriz asíncrona de permisos.
 */
$(document).ready(function () {
    let dataTable;
    let isEditing = false;
    let modal;
    let permisosModal;
    let esSuperAdmin = false;
    const formid = '#form';

    const API_BASE = '/perfiles/api';
    const ENDPOINTS = {
        list: `${API_BASE}/listar`,
        save: `${API_BASE}/guardar`,
        get: (id) => `${API_BASE}/obtener/${id}`,
        toggleStatus: (id) => `${API_BASE}/cambiar-estado/${id}`,
        delete: (id) => `${API_BASE}/eliminar/${id}`,
        options: `${API_BASE}/opciones`,
        rolSesion: '/usuarios/api/rol-sesion'
    };

    // 🛡️ CONTROL JERÁRQUICO PRIORITARIO: Evaluamos el rango antes de inicializar la interfaz
    fetch(ENDPOINTS.rolSesion)
        .then(response => response.json())
        .then(data => {
            esSuperAdmin = data.esSuperAdmin || false;

            // Una vez resuelta la identidad, montamos el DOM seguro
            initializeDataTable();
            modal = new bootstrap.Modal(document.getElementById('modal'));
            permisosModal = new bootstrap.Modal(document.getElementById('permisosModal'));
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error al capturar el rol de sesión:', error);
            initializeDataTable(); // Caída de contingencia segura
        });

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
                    render: (data) => data === 1
                        ? '<span class="badge text-bg-success px-3 py-1 rounded-pill">Activo</span>'
                        : '<span class="badge text-bg-danger px-3 py-1 rounded-pill">Inactivo</span>'
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
                    "first": "Primero", "last": "Último", "next": "Siguiente", "previous": "Anterior"
                }
            },
            pageLength: 10
        });
    }

    function createActionButtons(row) {
        // 🛡️ REGLA DE NEGOCIO: Si el usuario no es SUPER_ADMIN, se inyecta una clase especial para bloquear el click visualmente
        const lockClass = !esSuperAdmin ? 'btn-action-locked' : '';
        const lockTitleEdit = !esSuperAdmin ? 'Solo el Super Admin puede editar roles' : 'Editar Perfil';
        const lockTitlePerm = !esSuperAdmin ? 'Solo el Super Admin puede alterar privilegios' : 'Asignar Permisos';

        // 🌟 INTEGRACIÓN DE COMPONENTES CRUD CINÉTICOS PREMIUM PROTEGIDOS POR JERARQUÍA
        return `
            <div class="action-buttons-wrapper">
                <button type="button" class="action-jama-btn btn-action-edit action-edit ${lockClass}" data-id="${row.id}" title="${lockTitleEdit}">
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

                <button type="button" class="action-jama-btn btn-action-permissions action-permissions ${lockClass}" data-id="${row.id}" title="${lockTitlePerm}">
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

        // 🌟 CAPTURA DELEGADA INTEGRAL Y ULTRA-SEGURA: Resiste filtrados y saltos de página
        $('#tabla tbody').on('click', '.action-edit', function() { handleEdit($(this).data('id')); });
        $('#tabla tbody').on('click', '.action-status', function() { handleToggleStatus($(this).data('id')); });
        $('#tabla tbody').on('click', '.action-permissions', function() { handlePermissions($(this).data('id')); });
        $('#tabla tbody').on('click', '.action-delete', function() { handleDelete($(this).data('id')); });

        $('#btnGuardarPermisos').on('click', savePermissions);
    }

    function reloadTable() { dataTable.ajax.reload(null, false); }

    function savePerfil() {
        const perfilData = {
            id: $('#id').val() || null,
            nombre: $('#nombre').val().trim(),
            descripcion: $('#descripcion').val().trim(),
        };

        if (!perfilData.nombre) {
            AppUtils.showNotification('El nombre del rol es mandatorio.', 'error');
            return;
        }

        // 🛡️ ADUANA FRONTEND: Bloqueo de peticiones si no posee rango de fábrica
        if (!esSuperAdmin) {
            AppUtils.showNotification('Acceso denegado: Solo el Super Admin puede registrar o alterar perfiles.', 'error');
            return;
        }

        AppUtils.showLoading(true);
        fetch(ENDPOINTS.save, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
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
            .catch(error => AppUtils.showNotification('Error de comunicación con el servidor', 'error'))
            .finally(() => AppUtils.showLoading(false));
    }

    function handleEdit(id) {
        if (!esSuperAdmin) {
            AppUtils.showNotification('Operación denegada: Privilegios exclusivos del Super Admin.', 'error');
            return;
        }
        AppUtils.showLoading(true);
        fetch(`${ENDPOINTS.get(id)}?t=${new Date().getTime()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) { openModalForEdit(data.data); }
                else { AppUtils.showNotification('Error al recuperar los datos del rol.', 'error'); }
            })
            .catch(error => AppUtils.showNotification('Error de conexión', 'error'))
            .finally(() => AppUtils.showLoading(false));
    }

    function handleToggleStatus(id) {
        // 🛡️ ADUANA PROTECTORA DE SEGURIDAD NATIVA: Evita apagar las cuentas maestras
        const tr = $(`button[data-id="${id}"].action-status`).closest('tr');
        const row = dataTable.row(tr).data();
        if (row) {
            const nombreRol = row.nombre.toUpperCase().replace(/ /g, '_');
            if ((nombreRol.includes('SUPER_ADMIN') || nombreRol.includes('ADMINISTRADOR')) && !esSuperAdmin) {
                AppUtils.showNotification('Operación inválida: Solo el Super Admin puede suspender perfiles administrativos.', 'error');
                return;
            }
        }

        AppUtils.showLoading(true);
        fetch(ENDPOINTS.toggleStatus(id), { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) { AppUtils.showNotification(data.message, 'success'); reloadTable(); }
                else { AppUtils.showNotification(data.message, 'error'); }
            })
            .catch(error => AppUtils.showNotification('Error de conexión remota', 'error'))
            .finally(() => AppUtils.showLoading(false));
    }

    function handleDelete(id) {
        // 🛡️ ADUANA PROTECTORA DE SEGURIDAD NATIVA: Impide borrar la raíz del sistema
        const tr = $(`button[data-id="${id}"].action-delete`).closest('tr');
        const row = dataTable.row(tr).data();
        if (row) {
            const nombreRol = row.nombre.toUpperCase().replace(/ /g, '_');
            if ((nombreRol.includes('SUPER_ADMIN') || nombreRol.includes('ADMINISTRADOR')) && !esSuperAdmin) {
                AppUtils.showNotification('Operación denegada: No se puede purgar un perfil de nivel administrativo.', 'error');
                return;
            }
        }

        Swal.fire({
            title: '¿Eliminar este perfil operativo?',
            text: "¡Atención! Se revocarán de golpe las opciones de acceso a todos los usuarios ligados a este rol.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, purgar rol', cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                AppUtils.showLoading(true);
                fetch(ENDPOINTS.delete(id), { method: 'DELETE' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) { AppUtils.showNotification(data.message, 'success'); reloadTable(); }
                        else { AppUtils.showNotification(data.message, 'error'); }
                    })
                    .catch(error => AppUtils.showNotification('Error de comunicación con el servidor.', 'error'))
                    .finally(() => AppUtils.showLoading(false));
            }
        });
    }

    // ── CARGAR PERMISOS (CON COMPROBACIÓN CONTRA ANTICACHÉ) ────────────────
    async function handlePermissions(id) {
        if (!esSuperAdmin) {
            AppUtils.showNotification('Acceso denegado: El control de accesos es de atribución única del Super Admin.', 'error');
            return;
        }
        AppUtils.showLoading(true);
        $('#permisoPerfilId').val(id);

        try {
            const [perfilRes, opcionesRes] = await Promise.all([
                fetch(`${ENDPOINTS.get(id)}?t=${new Date().getTime()}`), // Rompe la memoria caché física del cliente
                fetch(ENDPOINTS.options)
            ]);

            const perfilData = await perfilRes.json();
            const opcionesData = await opcionesRes.json();

            if (perfilData.success && opcionesData.success) {
                $('#permisoPerfilNombre').text(perfilData.data.nombre);
                const listaOpciones = $('#listaOpciones');
                listaOpciones.empty();

                const opcionesActivasIds = perfilData.data.opciones ?
                    perfilData.data.opciones.map(op => parseInt(op.id || op)) : [];

                opcionesData.data.forEach(opcion => {
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
                AppUtils.showNotification('Error al procesar el mapeo de módulos.', 'error');
            }
        } catch (error) {
            AppUtils.showNotification('Fallo de respuesta al cargar la matriz de permisos.', 'error');
        } finally {
            AppUtils.showLoading(false);
        }
    }

    // ── GUARDAR PERMISOS (CORREGIDO PARA SINCRONIZACIÓN HIBERNATE) ──────────
        async function savePermissions() {
            if (!esSuperAdmin) {
                AppUtils.showNotification('Operación rechazada: Rango insuficiente.', 'error');
                return;
            }
            const perfilId = $('#permisoPerfilId').val();

            // 1. Capturamos los IDs numéricos seleccionados por el Super Admin
            const idsSeleccionados = $('#listaOpciones input:checked').map(function () {
                return parseInt($(this).val());
            }).get();

            AppUtils.showLoading(true);
            try {
                // 2. Traemos la instancia fresca del perfil desde el servidor anticaché
                const perfilRes = await fetch(`${ENDPOINTS.get(perfilId)}?t=${new Date().getTime()}`);
                const perfilData = await perfilRes.json();

                if (!perfilData.success) {
                    AppUtils.showNotification('No se pudo ubicar el perfil maestro para actualizar.', 'error');
                    return;
                }

                const perfilToUpdate = perfilData.data;

                // 3. 🌟 EL AJUSTE MAESTRO: Mapeamos los IDs hacia la estructura que el backend espera
                // Re-armamos la colección de opciones inyectándole el ID limpio en el formato nativo del ORM
                perfilToUpdate.opciones = idsSeleccionados.map(id => {
                    return {
                        id: id
                    };
                });

                // 4. Enviamos la petición POST para asentar la matriz en base de datos
                const saveRes = await fetch(ENDPOINTS.save, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(perfilToUpdate)
                });
                const saveData = await saveRes.json();

                if (saveData.success) {
                    permisosModal.hide();
                    AppUtils.showNotification('Fórmula de accesos actualizada con éxito en la base de datos.', 'success');
                    reloadTable(); // Sincroniza la tabla reactivamente sin meter F5
                } else {
                    AppUtils.showNotification(saveData.message || 'Error al procesar la actualización.', 'error');
                }
            } catch (error) {
                console.error("💥 Error en aduana de guardado de permisos:", error);
                AppUtils.showNotification('Error de conexión al inyectar permisos.', 'error');
            } finally {
                AppUtils.showLoading(false);
            }
        }

    function openModalForNew() {
        if (!esSuperAdmin) {
            AppUtils.showNotification('Acceso denegado: Solo el Super Admin posee privilegios de creación.', 'error');
            return;
        }
        isEditing = false;
        AppUtils.clearForm(formid);
        if (typeof Validation !== 'undefined') Validation.aplicarGlobal();
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
        if (typeof Validation !== 'undefined') Validation.aplicarGlobal();
        modal.show();
    }
});