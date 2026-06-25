// =========================================================================
// 🟩 OPERACIONES DE CAPAS NATIVAS - INSTANCIACIÓN EN VENTANA GLOBAL (window)
// =========================================================================
window.abrirCapaModal = function(idElemento) {
    const modal = document.getElementById(idElemento);
    if (modal) modal.removeAttribute('hidden');
};

window.cerrarCapaModal = function(idElemento) {
    const modal = document.getElementById(idElemento);
    if (modal) modal.setAttribute('hidden', true);
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

    // ⏳ CONFIGURACIÓN DE PASOS DE TIEMPO (Bloques de 15 minutos)
    ['rHora', 'eHora'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('step', '900'); // 900 segundos = 15 minutos exactos
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
            document.getElementById('eFecha').value = dt.toISOString().split('T')[0];
            document.getElementById('eHora').value  = dt.toTimeString().slice(0,5);
        }
        ['eNombre','eTelefono','ePersonas','eFecha','eHora'].forEach(id => {
            document.getElementById(id + '-error').textContent = '';
        });
        window.abrirCapaModal('modalEditarReserva');
    });
    $('#tablaReservas tbody').on('click', '.btn-eliminar', function () {
        eliminarReserva(this.dataset.id);
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

    // 🟩 AUDITORÍA INTERNA DE REGLAS DE TIEMPO
    function esIntervaloInvalido(horaStr) {
        if (!horaStr) return true;
        const minutos = parseInt(horaStr.split(':')[1]);
        return (minutos % 15 !== 0); // Failsafe: devuelve true si no es múltiplo de 15
    }});

