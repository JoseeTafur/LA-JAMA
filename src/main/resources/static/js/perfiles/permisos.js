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
