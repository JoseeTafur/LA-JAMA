// =========================================================================
// 🟩 OPERACIONES DE CAPAS NATIVAS - INSTANCIACIÓN EN VENTANA GLOBAL (window)
// =========================================================================

window.CalendarioEstado = {
    r: { mes: new Date().getMonth(), anio: new Date().getFullYear() },
    e: { mes: new Date().getMonth(), anio: new Date().getFullYear() }
};

window.cambiarMesCalendario = function(prefijo, direccion) {
    let estado = window.CalendarioEstado[prefijo];
    estado.mes += direccion;
    if (estado.mes < 0) { estado.mes = 11; estado.anio--; }
    if (estado.mes > 11) { estado.mes = 0; estado.anio++; }
    window.renderizarMatrizDiasDinamica(prefijo);
};

window.renderizarMatrizDiasDinamica = function(prefijo) {
    const contenedorGrid = document.getElementById(`${prefijo}_calendar__dates`);
    const tituloHeader = document.getElementById(`${prefijo}_cal_title`);
    const inputFechaOculto = document.getElementById(`${prefijo}Fecha`);

    if (!contenedorGrid || !tituloHeader) return;

    const { mes, anio } = window.CalendarioEstado[prefijo];
    const mesesNombres = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    tituloHeader.textContent = `${mesesNombres[mes]} ${anio}`;

    contenedorGrid.innerHTML = '';

    const primerDiaMes = new Date(anio, mes, 1);
    const totalDiasMes = new Date(anio, mes + 1, 0).getDate();

    let diaSemanaInicio = primerDiaMes.getDay() - 1;
    if (diaSemanaInicio === -1) diaSemanaInicio = 6;

    const diasMesAnterior = new Date(anio, mes, 0).getDate();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
        const numeroDiaViejo = diasMesAnterior - i;
        contenedorGrid.innerHTML += `<div class="calendar__date calendar__date--grey"><span>${numeroDiaViejo}</span></div>`;
    }

    // 🛡️ ADUANA NORMALIZADA A MEDIANOCHE LIMPIA LOCAL
    const hoyCero = new Date();
    hoyCero.setHours(0, 0, 0, 0);

    const maxReserva = new Date();
    maxReserva.setDate(maxReserva.getDate() + 11);
    maxReserva.setHours(0, 0, 0, 0);

    for (let dia = 1; dia <= totalDiasMes; dia++) {
        // Creación explícita local sin desfase UTC
        const fechaCelda = new Date(anio, mes, dia);
        fechaCelda.setHours(0, 0, 0, 0);

        const esInvalido = (fechaCelda < hoyCero || fechaCelda > maxReserva);
        const fechaFormateadaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        const esSeleccionado = (inputFechaOculto && inputFechaOculto.value === fechaFormateadaStr);

        let claseCelda = 'calendar__date';
        if (esInvalido) claseCelda += ' calendar__date--disabled';
        if (esSeleccionado) claseCelda += ' calendar__date--selected';

        const divDia = document.createElement('div');
        divDia.className = claseCelda;
        divDia.innerHTML = `<span>${dia}</span>`;

        if (!esInvalido) {
            divDia.onclick = function() {
                contenedorGrid.querySelectorAll('.calendar__date').forEach(el => el.classList.remove('calendar__date--selected'));
                divDia.classList.add('calendar__date--selected');

                if (inputFechaOculto) {
                    inputFechaOculto.value = fechaFormateadaStr;
                    // Gatilla la aduana limpia de validation.js de forma conforme
                    inputFechaOculto.dispatchEvent(new Event('change'));
                }
            };
        }
        contenedorGrid.appendChild(divDia);
    }
};


window.abrirCapaModal = function(idElemento) {
    const modalEl = document.getElementById(idElemento);
    if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
    }
};

window.cerrarCapaModal = function(idElemento) {
    const modalEl = document.getElementById(idElemento);
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }
};

$(document).ready(function () {
    let dataTable;
    const CAPACIDAD_MESA = 4;
    const TOTAL_MESAS_RESTAURANTE = 40; // 🌟 Límite de control físico para La Jama

    // 🗓️ CONFIGURACIÓN DE RANGOS DE FECHA DINÁMICOS
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    // Máximo 1 semana y media adelante (11 días exactos)
    const maxFecha = new Date();
    maxFecha.setDate(hoy.getDate() + 11);
    const maxFechaStr = maxFecha.toISOString().split('T')[0];

    // Aplicar límites nativos al input de los formularios
    ['rFecha', 'eFecha'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.setAttribute('min', hoyStr);
            el.setAttribute('max', maxFechaStr);
        }
    });

    // ⏳ CONFIGURACIÓN DE PASOS DE TIEMPO (LIBERADO: Minuto a minuto)
    ['rHora', 'eHora'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('step', '60'); // 60 segundos = 1 minuto exacto (Cualquier hora permitida)
    });

    // Validaciones de caracteres en tiempo real
    document.getElementById('rNombre').addEventListener('input', function () {
        this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
    });
    document.getElementById('rTelefono').addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });

    // Calcular mesas necesarias al cambiar personas con validación de aforo
    document.getElementById('rPersonas').addEventListener('input', function () {
        const personas = parseInt(this.value);
        const errorDiv = document.getElementById('rPersonas-error');
        errorDiv.textContent = '';

        if (personas > 0) {
            const mesas = Math.ceil(personas / CAPACIDAD_MESA);

            if (mesas > TOTAL_MESAS_RESTAURANTE) {
                errorDiv.textContent = `Excede la capacidad del salón. Máximo ${TOTAL_MESAS_RESTAURANTE * CAPACIDAD_MESA} comensales (${TOTAL_MESAS_RESTAURANTE} mesas).`;
                document.getElementById('mesasInfo').style.display = 'none';
            } else {
                document.getElementById('mesasInfo').style.display = 'block';
                document.getElementById('mesasInfoTexto').textContent =
                    `Para ${personas} personas se ocuparán automáticamente ${mesas} de las ${TOTAL_MESAS_RESTAURANTE} mesas de La Jama.`;
            }
        } else {
            document.getElementById('mesasInfo').style.display = 'none';
        }
    });

    initDataTable();

    $('#btnNuevoRegistro').on('click', function () {
            limpiarModal();
            window.abrirCapaModal('modalReserva');

            window.renderizarMatrizDiasDinamica('r');
        });

    $('#form').on('submit', function (e) {
        e.preventDefault();
        guardarReserva();
    });

    // Eventos delegados para confirmar/cancelar/editar (DataTables)
    $('#tablaReservas tbody').on('click', '.btn-confirmar', function () {
        const id = $(this).data('id');
        confirmarLlegada(id);
    });
    $('#tablaReservas tbody').on('click', '.btn-cancelar', function () {
        const id = $(this).data('id');
        cancelarReserva(id);
    });
    $('#tablaReservas tbody').on('click', '.btn-editar', function () {
            const d = this.dataset;
            document.getElementById('eReservaId').value   = d.id;
            document.getElementById('eNombre').value      = d.nombre;
            document.getElementById('eTelefono').value    = d.telefono;
            document.getElementById('ePersonas').value    = d.personas;
            document.getElementById('eObservacion').value = d.observacion || '';

            if (d.fecha) {
                const dt = new Date(d.fecha);
                const fechaFormateada = dt.toISOString().split('T')[0];
                document.getElementById('eFecha').value = fechaFormateada;
                document.getElementById('eHora').value  = dt.toTimeString().slice(0,5);

                // Sincronizar el almacén del calendario de edición con el mes/año de la reserva seleccionada
                const anioReserva = parseInt(fechaFormateada.split('-')[0]);
                const mesReserva  = parseInt(fechaFormateada.split('-')[1]) - 1;

                window.CalendarioEstado.e.mes = mesReserva;
                window.CalendarioEstado.e.anio = anioReserva;
            }
            ['eNombre','eTelefono','ePersonas','eFecha','eHora'].forEach(id => {
                const errEl = document.getElementById(id + '-error');
                if (errEl) errEl.textContent = '';
            });
            window.abrirCapaModal('modalEditarReserva');

            // Dibujamos la cuadrícula de edición posicionada en la fecha correcta
            window.renderizarMatrizDiasDinamica('e');
        });

    document.getElementById('btnGuardarEdicion').addEventListener('click', guardarEdicion);

    function initDataTable() {
        dataTable = $('#tablaReservas').DataTable({
            responsive: false,
            autoWidth: false,
            ajax: { url: '/admin/reservas/api/listar', dataSrc: 'data' },
            columns: [
                { data: 'id', width: '5%' },
                { data: 'nombreCliente', width: '20%' },
                { data: 'telefono', width: '10%' },
                { data: 'numeroPersonas', width: '8%' },
                { data: 'mesasAsignadas', defaultContent: '-', width: '15%' },
                {
                    data: 'fechaHoraReserva',
                    width: '15%',
                    render: (fecha) => {
                        if (!fecha) return '-';
                        const d = new Date(fecha);
                        return d.toLocaleDateString('es-PE') + ' ' + d.toLocaleTimeString('es-PE', {hour: '2-digit', minute:'2-digit'});
                    }
                },
                {
                    data: 'estado',
                    width: '10%',
                    render: (estado) => {
                        const badges = {
                            'PENDIENTE': 'bg-warning text-dark',
                            'CONFIRMADA': 'bg-success',
                            'CANCELADA': 'bg-danger',
                            'COMPLETADA': 'bg-secondary',
                            'EXPIRADA': 'bg-danger'
                        };
                        return `<span class="badge ${badges[estado] || 'bg-secondary'}">${estado}</span>`;
                    }
                },
                { data: 'observacion', defaultContent: '-', width: '12%' },
                {
                    data: null,
                    orderable: false,
                    width: '10%',
                    className: 'text-center',
                    render: (data, type, row) => {
                        let btns = '<div class="d-flex justify-content-center gap-1">';
                        if (row.estado === 'CONFIRMADA') {
                            btns += `<button class="btn btn-sm btn-success btn-confirmar" data-id="${row.id}" title="Confirmar llegada"><i class="bi bi-check-circle"></i></button>`;
                        }
                        if (row.estado === 'PENDIENTE' || row.estado === 'CONFIRMADA') {
                            btns += `<button class="btn btn-sm btn-danger btn-cancelar" data-id="${row.id}" title="Cancelar reserva"><i class="bi bi-x-circle"></i></button>`;
                        }
                        if (row.estado === 'PENDIENTE' || row.estado === 'CONFIRMADA') {
                            btns += `<button class="btn btn-sm btn-warning btn-editar" data-id="${row.id}" data-nombre="${row.nombreCliente}" data-telefono="${row.telefono}" data-personas="${row.numeroPersonas}" data-fecha="${row.fechaHoraReserva || ''}" data-observacion="${row.observacion || ''}" title="Editar reserva"><i class="bi bi-pencil"></i></button>`;
                        }
                        btns += `<button class="btn btn-sm btn-outline-danger btn-eliminar" data-id="${row.id}" title="Eliminar reserva"><i class="bi bi-trash"></i></button>`;
                        btns += '</div>';
                        return btns;
                    }
                }
            ],
            language: {
                processing: "Procesando...", lengthMenu: "Mostrar _MENU_",
                zeroRecords: "No hay reservas", emptyTable: "Sin reservas registradas",
                info: "Mostrando _START_ al _END_ de _TOTAL_",
                search: "Buscar:",
                paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" }
            },
            order: [[5, 'desc']]
        });
    }

    // 🟩 AUDITORÍA INTERNA DE REGLAS DE TIEMPO (DESACTIVADO: Siempre libre)
    function esIntervaloInvalido(horaStr) {
        return false; // Retorna siempre false para admitir cualquier combinación de minutos
    }

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
        const idReserva = document.getElementById('eReservaId').value;
        const nombre   = document.getElementById('eNombre').value.trim();
        const telefono = document.getElementById('eTelefono').value.trim();
        const personas = parseInt(document.getElementById('ePersonas').value);
        const fecha    = document.getElementById('eFecha').value;
        const hora     = document.getElementById('eHora').value;
        const obs      = document.getElementById('eObservacion').value.trim();

        const CAPACIDAD_MESA = 4;
        const TOTAL_MESAS_RESTAURANTE = 40;

        const hoy = new Date();
        const hoyStr = hoy.toISOString().split('T')[0];

        const maxFecha = new Date();
        maxFecha.setDate(hoy.getDate() + 11);
        const maxFechaStr = maxFecha.toISOString().split('T')[0];

        let hayError = false;

        ['eNombre','eTelefono','ePersonas','eFecha','eHora'].forEach(idInput => {
            const errorEl = document.getElementById(idInput + '-error');
            if (errorEl) errorEl.textContent = '';
        });

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
        }

        if (hayError) return;

        const fechaHora = fecha + 'T' + hora + ':00';
        if (new Date(fechaHora) <= new Date()) {
            document.getElementById('eFecha-error').textContent = 'No puede ser en el pasado.';
            return;
        }

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

var socketCocina = new SockJS('/ws-restaurante'); var stompReservas = Stomp.over(socketCocina); stompReservas.debug = null; stompReservas.connect({}, function (frame) { stompReservas.subscribe('/topic/notificaciones', function (payload) { const mensaje = payload.body; if (mensaje.includes("🚨 ATENCIÓN RESERVA")) { var audioAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); audioAlerta.play().catch(e => console.log("Audio retenido")); Swal.fire({ icon: 'info', title: '¡CLIENTE DE RESERVA EN TIEMPO!', text: mensaje, background: '#f0fdf4', color: '#14532d', confirmButtonColor: '#1B3A2C', confirmButtonText: '<i class="bi bi-calendar-check me-2"></i> Entendido', allowOutsideClick: true }); if (typeof dataTable !== 'undefined') dataTable.ajax.reload(null, false); } else if (mensaje.includes("⚠️ RESERVA EXPIRADA")) { AppUtils.showNotification(mensaje, 'error'); if (typeof dataTable !== 'undefined') dataTable.ajax.reload(null, false); } }); });