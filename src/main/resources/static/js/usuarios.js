/**
 * LA JAMA — usuarios.js
 * Gestión de personal, aduana de roles y control jerárquico de accesos (Shadcn System).
 */
$(document).ready(function () {
    let dataTable;
    let modal;
    let esSuperAdmin = false;
    let esAdmin = false;

    const formId = '#form';
    const API_BASE = '/usuarios/api';

    const ENDPOINTS = {
        list: `${API_BASE}/listar`,
        save: `${API_BASE}/guardar`,
        get: (id) => `${API_BASE}/obtener/${id}`,
        delete: `${API_BASE}/eliminar`,
        profiles: `${API_BASE}/perfiles`,
        toggleStatus: (id) => `${API_BASE}/cambiar-estado/${id}`,
        rolSesion: `${API_BASE}/rol-sesion`
    };

    // 🛡️ PRIMER PASO: Validamos los privilegios del usuario firmado antes de pintar la UI
    fetch(ENDPOINTS.rolSesion)
        .then(response => response.json())
        .then(data => {
            esSuperAdmin = data.esSuperAdmin || false;
            esAdmin = data.esAdmin || false;

            // Una vez que el JS conoce el rol, inicializa los componentes seguros
            initializeDataTable();
            modal = new bootstrap.Modal(document.getElementById('modal'));
            loadProfiles();
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error al validar la jerarquía de sesión:', error);
            initializeDataTable(); // Caída de emergencia segura
        });

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
                        '<span class="badge text-bg-success px-3 py-1 rounded-pill">Activo</span>'
                        : '<span class="badge text-bg-danger px-3 py-1 rounded-pill">Inactivo</span>'
                },
                {
                    data: null, orderable: false, searchable: false,
                    render: (data, type, row) => {
                        // 🌟 Conservamos intactos tus botones cinéticos premium personalizados
                        return `
                        <div class="action-buttons-wrapper justify-content-center">
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

                            <button type="button" class="action-jama-btn btn-action-status action-status ${row.estado === 1 ? 'is-active' : ''}" data-id="${row.id}" title="Alternar Estado">
                                <svg class="eye-lid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7"/>
                                </svg>
                                <svg class="eye-pupil" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                    <circle cx="12" cy="12" r="3"/>
                                </svg>
                                <div class="eye-flash"></div>
                            </button>

                            <button type="button" class="action-jama-btn btn-action-delete" data-id="${row.id}" title="Eliminar Registro">
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
                processing: "Procesando...", lengthMenu: "Mostrar _MENU_ registros",
                zeroRecords: "No se encontraron resultados", emptyTable: "Ningún dato disponible en esta tabla",
                info: "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
                infoEmpty: "Mostrando registros del 0 al 0 de un total de 0 registros",
                infoFiltered: "(filtrado de un total de _MAX_ registros)", search: "Buscar:",
                loadingRecords: "Cargando...",
                paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" }
            }
        });
    }

    function setupEventListeners() {
        $('#btnNuevoRegistro').on('click', openModalForNew);

        $(formId).on('submit', function (e) {
            e.preventDefault();
            saveUsuario();
        });

        // 🌟 Captura delegada ultra-segura basada en tus argumentos de ID explícitos
        $('#tabla tbody').on('click', '.action-edit', function () {
            handleEdit($(this).data('id'));
        });

        $('#tabla tbody').on('click', '.action-status', function () {
            handleToggleStatus($(this).data('id'));
        });

        $('#tabla tbody').on('click', '.btn-action-delete', function () {
            handleDelete($(this).data('id'));
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
                    data.data.forEach(profile => {
                        // 🛡️ REGLA: Ocultamos el rol SUPER_ADMIN de las opciones si quien edita es un ADMIN ordinario
                        if (!esSuperAdmin && profile.nombre.toUpperCase().replace(/ /g, '_').includes('SUPER_ADMIN')) return;
                        select.append(`<option value="${profile.id}">${profile.nombre}</option>`);
                    });
                } else { AppUtils.showNotification('Error al cargar perfiles', 'error'); }
            }).catch(error => console.error('Error cargando perfiles:', error));
    }

    function saveUsuario() {
        limpiarErrores();

        const usuarioVal = $('#usuario').val().trim();
        const correoVal  = $('#correo').val().trim();
        const claveVal   = $('#clave').val();
        const esNuevo    = !$('#id').val();

        // 🛡️ ADUANA FRONTEND A: Límites físicos de base de datos
        if (usuarioVal.length > 30) {
            AppUtils.showNotification('El identificador de usuario no puede superar los 30 caracteres.', 'error');
            return;
        }
        if (correoVal.length > 50) {
            AppUtils.showNotification('El correo electrónico no puede superar los 50 caracteres.', 'error');
            return;
        }

        // 🛡️ ADUANA FRONTEND B: Formato de correo eインジェクション (Regex limpia)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoVal)) {
            AppUtils.showNotification('Por favor, ingresa una estructura de correo electrónico válida.', 'error');
            return;
        }

        // 🛡️ ADUANA FRONTEND C: Espacios vacíos en el login
        if (/\s/.test(usuarioVal)) {
            AppUtils.showNotification('El nombre de usuario no puede contener espacios en blanco.', 'error');
            return;
        }

        // 🛡️ ADUANA FRONTEND D: Fortalezas de clave por rango
        if (esNuevo && claveVal.length < 6) {
            AppUtils.showNotification('La contraseña de seguridad debe contener como mínimo 6 caracteres.', 'error');
            return;
        }
        if (!esNuevo && claveVal && claveVal.length < 6) {
            AppUtils.showNotification('La nueva contraseña debe contener como mínimo 6 caracteres.', 'error');
            return;
        }

        const formData = {
            id: $('#id').val() || null,
            usuario: usuarioVal,
            correo: correoVal,
            perfil: { id: $('#id_perfil').val() },
            clave: claveVal
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
            // 🛡️ OPTIMIZADO: Filtro inteligente contra el Rate Limit (Evita pisar el mensaje premium)
            .catch(error => {
                if (error.isJamaSecure) return;
                AppUtils.showNotification('Error de comunicación con el servidor', 'error');
            })
            .finally(() => AppUtils.showLoading(false));
    }

    function handleEdit(id) {
        AppUtils.showLoading(true);
        fetch(`${ENDPOINTS.get(id)}?t=${new Date().getTime()}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) { openModalForEdit(data.data); }
                else { AppUtils.showNotification('Error al cargar la ficha del usuario', 'error'); }
            })
            // 🛡️ OPTIMIZADO: Filtro inteligente contra el Rate Limit
            .catch(error => {
                if (error.isJamaSecure) return;
                AppUtils.showNotification('Error de conexión', 'error');
            })
            .finally(() => AppUtils.showLoading(false));
    }

    function handleToggleStatus(id) {
        AppUtils.showLoading(true);
        fetch(ENDPOINTS.toggleStatus(id), { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.success) { AppUtils.showNotification(data.message, 'success'); reloadTable(); }
                else { AppUtils.showNotification(data.message, 'error'); }
            })
            // 🛡️ OPTIMIZADO: Filtro inteligente contra el Rate Limit
            .catch(error => {
                if (error.isJamaSecure) return;
                AppUtils.showNotification('Error de conexión remota', 'error');
            })
            .finally(() => AppUtils.showLoading(false));
    }

    function handleDelete(id) {
        Swal.fire({
            title: '¿Remover cuenta del sistema?', text: "El empleado perderá sus accesos de forma inmediata.",
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, purgar cuenta', cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                AppUtils.showLoading(true);
                fetch(`${ENDPOINTS.delete}/${id}`, { method: 'DELETE' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) { AppUtils.showNotification(data.message, 'success'); reloadTable(); }
                        else { AppUtils.showNotification(data.message, 'error'); }
                    })
                    // 🛡️ OPTIMIZADO: Filtro inteligente contra el Rate Limit
                    .catch(error => {
                        if (error.isJamaSecure) return;
                        AppUtils.showNotification('Error de conexión', 'error');
                    })
                    .finally(() => AppUtils.showLoading(false));
            }
        });
    }

    function openModalForNew() {
        limpiarErrores();
        AppUtils.clearForm(formId);
        $('#modalTitle').text('Agregar Usuario');
        $('#hint-permisos').remove();

        // Desbloqueo de inputs para nuevos operarios
        $('#usuario, #correo, #clave').prop('readonly', false).prop('disabled', false);
        $('#id_perfil').prop('disabled', false);
        modal.show();
    }

    function openModalForEdit(usuario) {
        limpiarErrores();
        AppUtils.clearForm(formId);
        $('#modalTitle').text('Editar Usuario');
        $('#hint-permisos').remove();

        $('#id').val(usuario.id);
        $('#usuario').val(usuario.usuario);
        $('#correo').val(usuario.correo);
        $('#id_perfil').val(usuario.perfil ? usuario.perfil.id : '');
        $('#clave').val('');

        const perfilNombre = usuario.perfil ? usuario.perfil.nombre.toUpperCase().replace(/ /g, '_') : '';
        const esObjetivoAdmin = perfilNombre.includes('ADMIN') || perfilNombre.includes('ADMINISTRADOR');

        // 🛡️ REGLAS DE NEGOCIO EN CALIENTE DIRECTO AL DOM:
        if (esSuperAdmin) {
            // El Super Admin edita lo que quiera de quien sea
            $('#usuario, #correo, #clave').prop('readonly', false).prop('disabled', false);
            $('#id_perfil').prop('disabled', false);
        } else if (esAdmin && !esObjetivoAdmin) {
            // Un Admin puede alterar operarios secundarios, pero NO degradar su rol ni cambiar su clave
            $('#usuario, #correo').prop('readonly', false).prop('disabled', false);
            $('#clave').prop('readonly', true);
            $('#id_perfil').prop('disabled', true);
        } else if (esAdmin && esObjetivoAdmin) {
            // Un Admin plano tiene bloqueados TODOS los campos de otra cuenta administradora
            $('#usuario, #correo, #clave').prop('readonly', true).prop('disabled', false);
            $('#id_perfil').prop('disabled', true);

            // Inyectamos el banner explicativo usando tus layouts limpios
            $('#form .row').prepend(`
                <div id="hint-permisos" class="col-12">
                    <div class="alert alert-danger border-0 rounded-3 py-2 small mb-2 text-start" style="background-color: #fce8e6; color: #a51d24;">
                        <i class="bi bi-shield-lock-fill me-1"></i>
                        Seguridad de Rango: No tienes permisos para alterar una cuenta administradora. Solo el <strong>Super Admin</strong> posee dicha atribución.
                    </div>
                </div>
            `);
        }

        modal.show();
    }

    function limpiarErrores() { $('.invalid-feedback').text(''); }
});