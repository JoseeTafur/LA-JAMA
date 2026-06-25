    function guardarReserva() {
        const nombre = $('#rNombre').val().trim();
        const telefono = $('#rTelefono').val().trim();
        const personas = parseInt($('#rPersonas').val());
        const fecha = $('#rFecha').val();
        const hora = $('#rHora').val();
        const observacion = $('#rObservacion').val().trim();

        ['rNombre','rTelefono','rPersonas','rFecha','rHora'].forEach(id => {
            document.getElementById(id + '-error').textContent = '';
        });

        let hayError = false;

        if (!nombre) { document.getElementById('rNombre-error').textContent = 'El nombre es obligatorio.'; hayError = true; }
        if (!telefono || telefono.length !== 9) { document.getElementById('rTelefono-error').textContent = 'El teléfono debe tener 9 dígitos.'; hayError = true; }

        if (!personas || personas < 1) {
            document.getElementById('rPersonas-error').textContent = 'Mínimo 1 comensal.';
            hayError = true;
        } else if (Math.ceil(personas / CAPACIDAD_MESA) > TOTAL_MESAS_RESTAURANTE) {
            document.getElementById('rPersonas-error').textContent = `Máximo permitido: ${TOTAL_MESAS_RESTAURANTE * CAPACIDAD_MESA} personas.`;
            hayError = true;
        }

        if (!fecha) {
            document.getElementById('rFecha-error').textContent = 'La fecha es obligatoria.';
            hayError = true;
        } else if (fecha < hoyStr || fecha > maxFechaStr) {
            document.getElementById('rFecha-error').textContent = 'Fecha fuera del rango permitido (Hoy a 1 semana y media).';
            hayError = true;
        }

        if (!hora) {
            document.getElementById('rHora-error').textContent = 'La hora es obligatoria.';
            hayError = true;
        } else if (esIntervaloInvalido(hora)) {
            document.getElementById('rHora-error').textContent = 'Intervalos permitidos cada 15 minutos (Ej. 12:00, 12:15, 12:30).';
            hayError = true;
        }

        if (hayError) return;

        const fechaHora = fecha + 'T' + hora + ':00';

        if (new Date(fechaHora) <= new Date()) {
            document.getElementById('rFecha-error').textContent = 'La fecha y hora no puede ser en el pasado.';
            return;
        }

        const payload = { nombreCliente: nombre, telefono, numeroPersonas: personas, fechaHora, observacion };

        AppUtils.showLoading(true);
        fetch('/admin/reservas/api/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                window.cerrarCapaModal('modalReserva');
                AppUtils.showNotification(data.message, 'success');
                dataTable.ajax.reload();
            } else {
                AppUtils.showNotification(data.message, 'error');
            }
        })
        .catch(() => AppUtils.showNotification('Error de conexión', 'error'))
        .finally(() => AppUtils.showLoading(false));
    }

    function guardarEdicion() {
        // 1. Captura de elementos limpia
        const idReserva = document.getElementById('eReservaId').value;
        const nombre   = document.getElementById('eNombre').value.trim();
        const telefono = document.getElementById('eTelefono').value.trim();
        const personas = parseInt(document.getElementById('ePersonas').value);
        const fecha    = document.getElementById('eFecha').value;
        const hora     = document.getElementById('eHora').value;
        const obs      = document.getElementById('eObservacion').value.trim();

        // Constantes de control (Aseguradas dentro del alcance de la edición)
        const CAPACIDAD_MESA = 4;
        const TOTAL_MESAS_RESTAURANTE = 40;

        // Control dinámico de fechas para evitar bloqueos por cambio de día (Failsafe)
        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];

        const maxFecha = new Date();
        maxFecha.setDate(hoy.getDate() + 11); // Semana y media límite
        const maxFechaStr = maxFecha.toISOString().split('T')[0];

        let hayError = false;

        // 🌟 CORRECCIÓN: Cambiado 'id' por 'idInput' para evitar colisiones de variables
        ['eNombre','eTelefono','ePersonas','eFecha','eHora'].forEach(idInput => {
            const errorEl = document.getElementById(idInput + '-error');
            if (errorEl) errorEl.textContent = '';
        });

        // 2. Motor de Validaciones de Negocio
        if (!nombre) { document.getElementById('eNombre-error').textContent = 'Obligatorio.'; hayError = true; }
        if (!telefono || telefono.length !== 9) { document.getElementById('eTelefono-error').textContent = '9 dígitos.'; hayError = true; }

        if (!personas || personas < 1) {
            document.getElementById('ePersonas-error').textContent = 'Mínimo 1.';
            hayError = true;
        } else if (Math.ceil(personas / CAPACIDAD_MESA) > TOTAL_MESAS_RESTAURANTE) {
            document.getElementById('ePersonas-error').textContent = `Supera capacidad de ${TOTAL_MESAS_RESTAURANTE} mesas.`;
            hayError = true;
        }

        if (!fecha) {
            document.getElementById('eFecha-error').textContent = 'Obligatorio.';
            hayError = true;
        } else if (fecha < hoyStr || fecha > maxFechaStr) {
            document.getElementById('eFecha-error').textContent = 'Fuera de rango.';
            hayError = true;
        }

        if (!hora) {
            document.getElementById('eHora-error').textContent = 'Obligatorio.';
            hayError = true;
        } else if (typeof esIntervaloInvalido === 'function' && esIntervaloInvalido(hora)) {
            document.getElementById('eHora-error').textContent = 'Bloques de 15 min.';
            hayError = true;
        }

        if (hayError) return;

        // 3. Validación de tiempo real
        const fechaHora = fecha + 'T' + hora + ':00';
        if (new Date(fechaHora) <= new Date()) {
            document.getElementById('eFecha-error').textContent = 'No puede ser en el pasado.';
            return;
        }

        // 4. Despacho al Controlador de Spring Boot
        AppUtils.showLoading(true);
        fetch(`/admin/reservas/api/editar/${idReserva}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombreCliente: nombre,
                telefono: telefono,
                numeroPersonas: personas,
                fechaHora: fechaHora,
                observacion: obs
            })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                window.cerrarCapaModal('modalEditarReserva');
                AppUtils.showNotification(data.message, 'success');
                if (typeof dataTable !== 'undefined') dataTable.ajax.reload();
            } else {
                AppUtils.showNotification(data.message, 'error');
            }
        })
        .catch(() => AppUtils.showNotification('Error de conexión', 'error'))
        .finally(() => AppUtils.showLoading(false));
    }

    // (Las funciones confirmarLlegada, cancelarReserva y eliminarReserva se mantienen idénticas...)
    function confirmarLlegada(id) {
        Swal.fire({ title: '¿Confirmar llegada?', text: 'Las mesas pasarán a estado OCUPADA.', icon: 'question', showCancelButton: true, confirmButtonColor: '#1B3A2C', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, confirmar', cancelButtonText: 'Cancelar' }).then(result => { if (result.isConfirmed) { AppUtils.showLoading(true); fetch(`/admin/reservas/api/confirmar-llegada/${id}`, { method: 'POST' }).then(r => r.json()).then(data => { if (data.success) { AppUtils.showNotification(data.message, 'success'); dataTable.ajax.reload(); } else AppUtils.showNotification(data.message, 'error'); }).catch(() => AppUtils.showNotification('Error de conexión', 'error')).finally(() => AppUtils.showLoading(false)); } });
    }
    function cancelarReserva(id) {
        Swal.fire({ title: '¿Cancelar reserva?', text: 'Las mesas quedarán disponibles nuevamente.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, cancelar', cancelButtonText: 'No' }).then(result => { if (result.isConfirmed) { AppUtils.showLoading(true); fetch(`/admin/reservas/api/cancelar/${id}`, { method: 'POST' }).then(r => r.json()).then(data => { if (data.success) { AppUtils.showNotification(data.message, 'success'); dataTable.ajax.reload(); } else AppUtils.showNotification(data.message, 'error'); }).catch(() => AppUtils.showNotification('Error de conexión', 'error')).finally(() => AppUtils.showLoading(false)); } });
    }
    function eliminarReserva(id) {
        Swal.fire({ title: '¿Eliminar reserva?', text: 'Esta acción no se puede deshacer. Las mesas quedarán disponibles.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'No' }).then(result => { if (result.isConfirmed) { AppUtils.showLoading(true); fetch(`/admin/reservas/api/eliminar/${id}`, { method: 'DELETE' }).then(r => r.json()).then(data => { if (data.success) { AppUtils.showNotification(data.message, 'success'); dataTable.ajax.reload(); } else AppUtils.showNotification(data.message, 'error'); }).catch(() => AppUtils.showNotification('Error de conexión', 'error')).finally(() => AppUtils.showLoading(false)); } });
    }
    function limpiarModal() {
        ['rNombre','rTelefono','rPersonas','rFecha','rHora','rObservacion'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        ['rNombre','rTelefono','rPersonas','rFecha','rHora'].forEach(id => { const el = document.getElementById(id + '-error'); if (el) el.textContent = ''; });
        document.getElementById('mesasInfo').style.display = 'none';
    }
});

// (Conexión asíncrona stompReservas intacta al final...)
