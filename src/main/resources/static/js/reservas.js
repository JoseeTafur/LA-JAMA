$(document).ready(function () {
    let dataTable;
    let modal;
    const CAPACIDAD_MESA = 4;

    modal = new bootstrap.Modal(document.getElementById('modalReserva'));

    // Fecha mínima = hoy
    const hoy = new Date();
    const hoyStr = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');
    document.getElementById('rFecha').setAttribute('min', hoyStr);

    // Validaciones en tiempo real
    document.getElementById('rNombre').addEventListener('input', function () {
        this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
    });
    document.getElementById('rTelefono').addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Calcular mesas necesarias al cambiar personas
    document.getElementById('rPersonas').addEventListener('input', function () {
        const personas = parseInt(this.value);
        if (personas > 0) {
            const mesas = Math.ceil(personas / CAPACIDAD_MESA);
            document.getElementById('mesasInfo').style.display = 'block';
            document.getElementById('mesasInfoTexto').textContent =
                `Para ${personas} personas se necesitan ${mesas} mesa(s). El sistema las asignará automáticamente.`;
        } else {
            document.getElementById('mesasInfo').style.display = 'none';
        }
    });

    // DataTable
    initDataTable();

    // Botón nueva reserva
    $('#btnNuevaReserva').on('click', function () {
        limpiarModal();
        modal.show();
    });

    // Guardar reserva
    $('#btnGuardarReserva').on('click', guardarReserva);

    // Eventos delegados para confirmar/cancelar
    $('#tablaReservas tbody').on('click', '.btn-confirmar', function () {
        const id = $(this).data('id');
        confirmarLlegada(id);
    });
    $('#tablaReservas tbody').on('click', '.btn-cancelar', function () {
        const id = $(this).data('id');
        cancelarReserva(id);
    });

    function initDataTable() {
        dataTable = $('#tablaReservas').DataTable({
            responsive: true,
            ajax: { url: '/admin/reservas/api/listar', dataSrc: 'data' },
            columns: [
                { data: 'id' },
                { data: 'nombreCliente' },
                { data: 'telefono' },
                { data: 'numeroPersonas' },
                
                    { data: 'mesasAsignadas', defaultContent: '-' },
                {
                    data: 'fechaHoraReserva',
                    render: (fecha) => {
                        if (!fecha) return '-';
                        const d = new Date(fecha);
                        return d.toLocaleDateString('es-PE') + ' ' + d.toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'});
                    }
                },
                {
                    data: 'estado',
                    render: (estado) => {
                        const badges = {
                            'PENDIENTE': 'bg-warning text-dark',
                            'CONFIRMADA': 'bg-success',
                            'CANCELADA': 'bg-danger',
                            'COMPLETADA': 'bg-secondary'
                        };
                        return `<span class="badge ${badges[estado] || 'bg-secondary'}">${estado}</span>`;
                    }
                },
                { data: 'observacion', defaultContent: '-' },
                {
                    data: null,
                    orderable: false,
                    render: (data, type, row) => {
                        let btns = '';
                        if (row.estado === 'CONFIRMADA') {
                            btns += `<button class="btn btn-sm btn-success btn-confirmar me-1" data-id="${row.id}" title="Confirmar llegada">
                                        <i class="bi bi-check-circle"></i>
                                     </button>`;
                        }
                        if (row.estado === 'PENDIENTE' || row.estado === 'CONFIRMADA') {
                            btns += `<button class="btn btn-sm btn-danger btn-cancelar me-1" data-id="${row.id}" title="Cancelar reserva">
                                        <i class="bi bi-x-circle"></i>
                                     </button>`;
                        }
                        if (row.estado === 'PENDIENTE' || row.estado === 'CONFIRMADA') {
                            btns += `<button class="btn btn-sm btn-warning btn-editar me-1" data-id="${row.id}"
                                        data-nombre="${row.nombreCliente}" data-telefono="${row.telefono}"
                                        data-personas="${row.numeroPersonas}" data-fecha="${row.fechaHoraReserva || ''}"
                                        data-observacion="${row.observacion || ''}" title="Editar reserva">
                                        <i class="bi bi-pencil"></i>
                                     </button>`;
                        }
                        btns += `<button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${row.id}" title="Eliminar reserva">
                                    <i class="bi bi-trash"></i>
                                 </button>`;
                        return btns || '<span class="text-muted small">-</span>';
                    }
                }
            ],
            language: {
                processing: "Procesando...", lengthMenu: "Mostrar _MENU_ registros",
                zeroRecords: "No hay reservas", emptyTable: "Sin reservas registradas",
                info: "Mostrando _START_ al _END_ de _TOTAL_",
                search: "Buscar:",
                paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" }
            },
            order: [[5, 'desc']]
        });
    }

    function guardarReserva() {
        const nombre = $('#rNombre').val().trim();
        const telefono = $('#rTelefono').val().trim();
        const personas = parseInt($('#rPersonas').val());
        const fecha = $('#rFecha').val();
        const hora = $('#rHora').val();
        const observacion = $('#rObservacion').val().trim();

        // Limpiar errores
        ['rNombre','rTelefono','rPersonas','rFecha','rHora'].forEach(id => {
            document.getElementById(id + '-error').textContent = '';
        });

        let hayError = false;

        if (!nombre) { document.getElementById('rNombre-error').textContent = 'El nombre es obligatorio.'; hayError = true; }
        else if (typeof Validation !== 'undefined' && !Validation.soloLetras(nombre)) {
            document.getElementById('rNombre-error').textContent = 'Solo letras.'; hayError = true;
        }
        if (!telefono || telefono.length !== 9) { document.getElementById('rTelefono-error').textContent = 'Teléfono debe tener 9 dígitos.'; hayError = true; }
        if (!personas || personas < 1) { document.getElementById('rPersonas-error').textContent = 'Ingresa el número de personas.'; hayError = true; }
        if (!fecha) { document.getElementById('rFecha-error').textContent = 'La fecha es obligatoria.'; hayError = true; }
        if (!hora) { document.getElementById('rHora-error').textContent = 'La hora es obligatoria.'; hayError = true; }

        if (hayError) return;

        const fechaHora = fecha + 'T' + hora + ':00';

        // Verificar que no sea en el pasado
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
                modal.hide();
                AppUtils.showNotification(data.message, 'success');
                dataTable.ajax.reload();
            } else {
                AppUtils.showNotification(data.message, 'error');
            }
        })
        .catch(() => AppUtils.showNotification('Error de conexión', 'error'))
        .finally(() => AppUtils.showLoading(false));
    }

    function confirmarLlegada(id) {
        Swal.fire({
            title: '¿Confirmar llegada?',
            text: 'Las mesas pasarán a estado OCUPADA.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                AppUtils.showLoading(true);
                fetch(`/admin/reservas/api/confirmar-llegada/${id}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) { AppUtils.showNotification(data.message, 'success'); dataTable.ajax.reload(); }
                    else AppUtils.showNotification(data.message, 'error');
                })
                .catch(() => AppUtils.showNotification('Error de conexión', 'error'))
                .finally(() => AppUtils.showLoading(false));
            }
        });
    }

    function cancelarReserva(id) {
        Swal.fire({
            title: '¿Cancelar reserva?',
            text: 'Las mesas quedarán disponibles nuevamente.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'No'
        }).then(result => {
            if (result.isConfirmed) {
                AppUtils.showLoading(true);
                fetch(`/admin/reservas/api/cancelar/${id}`, { method: 'POST' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) { AppUtils.showNotification(data.message, 'success'); dataTable.ajax.reload(); }
                    else AppUtils.showNotification(data.message, 'error');
                })
                .catch(() => AppUtils.showNotification('Error de conexión', 'error'))
                .finally(() => AppUtils.showLoading(false));
            }
        });
    }

    function limpiarModal() {
        ['rNombre','rTelefono','rPersonas','rFecha','rHora','rObservacion'].forEach(id => {
            document.getElementById(id).value = '';
        });
        ['rNombre','rTelefono','rPersonas','rFecha','rHora'].forEach(id => {
            document.getElementById(id + '-error').textContent = '';
        });
        document.getElementById('mesasInfo').style.display = 'none';
    }

    // ── Editar / Eliminar (delegación jQuery para DataTables) ────
    const modalEditar = new bootstrap.Modal(document.getElementById('modalEditarReserva'));

    $('#tablaReservas tbody').on('click', '.btn-editar', function () {
        const d = this.dataset;
        document.getElementById('eReservaId').value   = d.id;
        document.getElementById('eNombre').value      = d.nombre;
        document.getElementById('eTelefono').value    = d.telefono;
        document.getElementById('ePersonas').value    = d.personas;
        document.getElementById('eObservacion').value = d.observacion || '';

        if (d.fecha) {
            const dt = new Date(d.fecha);
            document.getElementById('eFecha').value = dt.toISOString().split('T')[0];
            document.getElementById('eHora').value  = dt.toTimeString().slice(0,5);
        }
        ['eNombre','eTelefono','ePersonas','eFecha','eHora'].forEach(id => {
            document.getElementById(id + '-error').textContent = '';
        });
        modalEditar.show();
    });

    $('#tablaReservas tbody').on('click', '.btn-eliminar', function () {
        eliminarReserva(this.dataset.id);
    });

    document.getElementById('btnGuardarEdicion').addEventListener('click', guardarEdicion);

    function guardarEdicion() {
        const id       = document.getElementById('eReservaId').value;
        const nombre   = document.getElementById('eNombre').value.trim();
        const telefono = document.getElementById('eTelefono').value.trim();
        const personas = parseInt(document.getElementById('ePersonas').value);
        const fecha    = document.getElementById('eFecha').value;
        const hora     = document.getElementById('eHora').value;
        const obs      = document.getElementById('eObservacion').value.trim();

        let hayError = false;
        ['eNombre','eTelefono','ePersonas','eFecha','eHora'].forEach(id => {
            document.getElementById(id + '-error').textContent = '';
        });

        if (!nombre) { document.getElementById('eNombre-error').textContent = 'Obligatorio.'; hayError = true; }
        if (!telefono || telefono.length !== 9) { document.getElementById('eTelefono-error').textContent = '9 dígitos.'; hayError = true; }
        if (!personas || personas < 1) { document.getElementById('ePersonas-error').textContent = 'Mínimo 1.'; hayError = true; }
        if (!fecha) { document.getElementById('eFecha-error').textContent = 'Obligatorio.'; hayError = true; }
        if (!hora)  { document.getElementById('eHora-error').textContent = 'Obligatorio.'; hayError = true; }
        if (hayError) return;

        const fechaHora = fecha + 'T' + hora + ':00';
        if (new Date(fechaHora) <= new Date()) {
            document.getElementById('eFecha-error').textContent = 'No puede ser en el pasado.';
            return;
        }

        AppUtils.showLoading(true);
        fetch(`/admin/reservas/api/editar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreCliente: nombre, telefono, numeroPersonas: personas, fechaHora, observacion: obs })
        })
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                modalEditar.hide();
                AppUtils.showNotification(data.message, 'success');
                dataTable.ajax.reload();
            } else {
                AppUtils.showNotification(data.message, 'error');
            }
        })
        .catch(() => AppUtils.showNotification('Error de conexión', 'error'))
        .finally(() => AppUtils.showLoading(false));
    }

    function eliminarReserva(id) {
        Swal.fire({
            title: '¿Eliminar reserva?',
            text: 'Esta acción no se puede deshacer. Las mesas quedarán disponibles.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'No'
        }).then(result => {
            if (result.isConfirmed) {
                AppUtils.showLoading(true);
                fetch(`/admin/reservas/api/eliminar/${id}`, { method: 'DELETE' })
                .then(r => r.json())
                .then(data => {
                    if (data.success) { AppUtils.showNotification(data.message, 'success'); dataTable.ajax.reload(); }
                    else AppUtils.showNotification(data.message, 'error');
                })
                .catch(() => AppUtils.showNotification('Error de conexión', 'error'))
                .finally(() => AppUtils.showLoading(false));
            }
        });
    }
});