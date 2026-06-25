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
        if (typeof Validation !== 'undefined') Validation.aplicarGlobal();
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

        if (typeof Validation !== 'undefined') Validation.aplicarGlobal();

        const perfilNombre = usuario.perfil ? usuario.perfil.nombre.toUpperCase().replace(/ /g, '_') : '';
        const esObjetivoAdmin = perfilNombre.includes('ADMIN') || perfilNombre.includes('ADMINISTRADOR');

        // 🛡️ REGLAS DE NEGOCIO EN CALIENTE DIRECTO AL DOM:
        if (esSuperAdmin) {
            // El Super Admin edita lo que quiera de quien sea
            $('#usuario, #correo, #clave').prop('readonly', false).prop('disabled', false);
            $('#id_perfil').prop('disabled', false);
        } else if (esAdmin && esObjetivoAdmin) {
            // Un Admin plano tiene bloqueados TODOS los campos de otra cuenta administradora
            $('#usuario, #correo, #clave').prop('readonly', true).prop('disabled', false);
            $('#id_perfil').prop('disabled', true);

            // 🚀 CORREGIDO: Se cambió '#form .row' por '#form .row.g-3' para que elija SOLO la primera fila
            $('#form .row.g-3').prepend(`
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
