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
