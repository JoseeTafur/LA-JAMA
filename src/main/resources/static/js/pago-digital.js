let filtrarVistaPagos; // 🚀 Exposición global para el atributo onclick de Thymeleaf
let modalEditar;

$(document).ready(function () {
    let dataTable;
    let isEditing = false;
    let modal;
    let modalImg;
    let situacionActual = 'PENDIENTE'; // 🚀 Control de la pestaña activa

    const formId = '#form';

    const baseImgUrl = APP_CONFIG.imageBaseUrl;

    const API_BASE = '/admin/pagos-digitales/api';
    const ENDPOINTS = {
        list:         `${API_BASE}/listar`,
        save:         `${API_BASE}/guardar`,
        get:          (id) => `${API_BASE}/obtener/${id}`,
        update:       (id) => `${API_BASE}/actualizar/${id}`,
        approve:      (id) => `${API_BASE}/aprobar/${id}`,
        cancel:       (id) => `${API_BASE}/anular/${id}`,
    };

    // ── 🚀 FILTRO DE AUDITORÍA ASÍNCRONO DE DATATABLES ────────────────
    $.fn.dataTable.ext.search.push(function (settings, data, dataIndex, rowData) {
        const situacionFila = rowData.situacion;
        if (situacionActual === 'PENDIENTE') {
            return situacionFila === 'PENDIENTE';
        } else {
            return situacionFila === 'APROBADO' || situacionFila === 'ANULADO';
        }
    });

    initializeDataTable();
    modal = new bootstrap.Modal(document.getElementById('modal'));
    modalImg = new bootstrap.Modal(document.getElementById('modalImg'));
    setupEventListeners();

    // ── 🚀 CAMBIADOR DE PESTAÑAS (MANTIENE LA DATA EN MEMORIA) ───────
    filtrarVistaPagos = function(tipo, elemento) {
        situacionActual = tipo;

        // Estilos dinámicos para las pestañas de La Jama
        $('.jama-tab-link').css({ 'border-bottom': 'none', 'color': '#6c757d' });
        $(elemento).css({ 'border-bottom': '3px solid #198754', 'color': '#198754' });

        // Redibujar la tabla aplicando instantáneamente el filtro pushed
        if (dataTable) {
            dataTable.draw();
        }
    };

    // ── DataTable ────────────────────────────────────────────
    function initializeDataTable() {
        dataTable = $('#tabla').DataTable({
            responsive: true,
            processing: true,
            ajax: { url: ENDPOINTS.list, dataSrc: 'data' },
            columns: [
                { data: 'id' },
                { data: null, render: (d) => d?.pedido?.cliente ?? "-" },
                { data: null, render: (d) => d?.pedido?.clienteCorreo ?? '<span class="text-muted italic">Sin correo</span>' }, // 🚀 MAPEO DE CORREO
                { data: 'fechaPago', defaultContent: '-' },
                {
                    data: 'situacion',
                    render: (d) => {
                        switch (d) {
                            case 'PENDIENTE': return '<span class="badge text-bg-warning">Pendiente</span>';
                            case 'APROBADO': return '<span class="badge text-bg-success">Aprobado</span>';
                            case 'ANULADO': return '<span class="badge text-bg-danger">Anulado</span>';
                            default: return '<span class="badge text-bg-secondary">Desconocido</span>';
                        }
                    }
                },
                { data: 'observacion', render: (data) => data?.trim() ? data : '-' },
                {
                    data: null, orderable: false, searchable: false,
                    render: (data, type, row) => createActionButtons(row)
                } // 🚀 REPARADO: Coma agregada implícitamente aquí al cerrar el array de columnas
            ],
            dom: "<'row pb-2 align-items-center'<'col-md-6'l><'col-md-6 d-flex justify-content-end'f>>" +
                 "<'row'<'col-sm-12'tr>>" +
                 "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
            language: {
                processing:    "Procesando...",
                lengthMenu:    "Mostrar _MENU_ registros",
                zeroRecords:   "No se encontraron resultados",
                emptyTable:    "Ningún dato disponible en esta tabla",
                info:          "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
                infoEmpty:     "Mostrando registros del 0 al 0 de un total de 0 registros",
                infoFiltered:  "(filtrado de un total de _MAX_ registros)",
                search:        "Buscar:",
                loadingRecords:"Cargando...",
                paginate: { first: "Primero", last: "Último", next: "Siguiente", previous: "Anterior" }
            }
        });
    }

    // ── Eventos ──────────────────────────────────────────
    function setupEventListeners() {
        $('#tabla').on('click', '.action-cancel', function () {
            const id = $(this).data('id');
            openModal(id, 'anular');
        });

        $('#tabla').on('click', '.action-approve', function () {
            const id = $(this).data('id');
            openModal(id, 'aprobar');
        });

        $('#tabla').on('click', '.action-see', function () {
            const id = $(this).data('id');
            openModalImg(id);
        });

        $(formId).on('submit', function (e) {
            e.preventDefault();
        });

        $('#modal').on('click', 'button[data-accion]', function () {
            const accion = $(this).data('accion');
            if (!accion) return;

            switch (accion) {
                case "aprobar": AppUtils.showConfirmationDialog({
                    title: "Aprobar pago",
                    text: "¿Está seguro que desea aprobar el pago?",
                    confirmButtonColor: '#198754',
                    confirmButtonText: 'Aprobar'
                }, aprobar); break;
                case "anular": AppUtils.showConfirmationDialog({
                    title: "Anular pago",
                    text: "¿Está seguro que desea anular el pago?",
                    confirmButtonColor: '#ffc107',
                    confirmButtonText: 'Anular'
                }, anular); break;
            }
        });
    }

    function anular() {
        limpiarErrores();
        const idVal = $('#id').val();
        const payload = { observacion: $('#observacion').val().trim() };

        AppUtils.showLoading(true);

        $.ajax({
            url:         ENDPOINTS.cancel(idVal),
            method:      'PATCH',
            contentType: 'application/json',
            data:        JSON.stringify(payload),
            success: function (res) {
                AppUtils.showLoading(false);
                if (res.success) {
                    modal.hide();
                    dataTable.ajax.reload();
                    AppUtils.showNotification(res.message, 'success');
                } else {
                    AppUtils.showNotification(res.message || 'Error al anular', 'error');
                }
            },
            error: function (xhr) {
                AppUtils.showLoading(false);
                const msg = xhr.responseJSON?.message || 'Error al anular el pago';
                AppUtils.showNotification(msg, 'error');
            }
        });
    }

    function aprobar() {
        limpiarErrores();
        const idVal = $('#id').val();
        const payload = { observacion: $('#observacion').val().trim() };

        AppUtils.showLoading(true);

        $.ajax({
            url:         ENDPOINTS.approve(idVal),
            method:      'PATCH',
            contentType: 'application/json',
            data:        JSON.stringify(payload),
            success: function (res) {
                if (res.success) {
                    modal.hide();
                    setTimeout(() => {
                        AppUtils.showLoading(false);
                        dataTable.ajax.reload();
                        AppUtils.showNotification(res.message, 'success');
                    }, 400);
                } else {
                    AppUtils.showLoading(false);
                    AppUtils.showNotification(res.message || 'Error al aprobar', 'error');
                }
            },
            error: function (xhr) {
                AppUtils.showLoading(false);
                const msg = xhr.responseJSON?.message || 'Error al aprobar el pago';
                AppUtils.showNotification(msg, 'error');
            }
        });
    }

    function setModalData(e, accion) {
        AppUtils.clearForm(formId);
        $('#modalTitle').text(accion === 'aprobar' ? 'Aprobar Pago' : 'Anular Pago');

        const pedido = e.pedido;
        let infoCliente = `<strong>Cliente:</strong> ${pedido.cliente || 'Anónimo'}<br>
                           <strong>Email:</strong> ${pedido.clienteCorreo || 'No registrado'}<br>
                           <strong>Tipo:</strong> ${pedido.preferenciaComprobante || 'BOLETA'}`;

        $('#info-cliente-modal').html(infoCliente);
        $('#id').val(e.id);
        $('#observacion').val(e.observacion);
    }

    function setModalActions(accion) {
        const aprobarBtn = $('[data-accion="aprobar"]');
        const anularBtn = $('[data-accion="anular"]');
        aprobarBtn.hide();
        anularBtn.hide();

        if (accion === 'aprobar') aprobarBtn.show();
        if (accion === 'anular') anularBtn.show();
    }

    function openModal(id, accion) {
        $.get(ENDPOINTS.get(id))
            .done(res => {
                if (!res.success) return;
                setModalData(res.data, accion);
                setModalActions(accion);
                modal.show();
            })
            .fail(() => {
                AppUtils.showNotification('Error al cargar el pago', 'error');
            });
    }

    function openModalImg(id) {
        const startTime = Date.now();
        AppUtils.showLoading(true);
        const minDuration = 200;
        $('#pagoImg').attr('src', '').hide();
        $('#imagen-error').text('');
        $('#modalImgTitle').text("Ver imagen");

        $.get(ENDPOINTS.get(id))
            .done(res => {
                if (!res.success) {
                    hideLoading(minDuration, startTime);
                    return;
                }

                let rawImgUrl = res.data.imgUrl;
                let imgUrl = '';

                if (rawImgUrl) {
                    if (rawImgUrl.includes('pagodigital/')) {
                        const partes = rawImgUrl.split('/');
                        rawImgUrl = partes[partes.length - 1];
                    }

                    if (rawImgUrl.startsWith('http://') || rawImgUrl.startsWith('https://')) {
                        imgUrl = rawImgUrl;
                    } else {
                        const cleanBase = baseImgUrl.endsWith('/') ? baseImgUrl : `${baseImgUrl}/`;
                        imgUrl = `${cleanBase}${rawImgUrl}.jpg`;
                    }

                    console.log("🖼️ [AUDITORÍA] Solicitando imagen real a Cloudinary:", imgUrl);

                    let settled = false;
                    const finish = (showImg, errorMsg = '') => {
                        if (settled) return;
                        settled = true;
                        $('#imagen-error').text(errorMsg);
                        if (showImg) $('#pagoImg').show();
                        else $('#pagoImg').hide();
                        hideLoading(minDuration, startTime);
                    };

                    const img = $('#pagoImg')
                        .off('load error')
                        .on('load', function () { finish(true); })
                        .on('error', function () { finish(false, 'No se pudo cargar la imagen'); })
                        .attr('src', imgUrl);

                    if (img[0].complete) {
                        finish(true);
                    }
                } else {
                    $('#pagoImg').hide();
                    $('#imagen-error').text('No se encontró imagen');
                    hideLoading(minDuration, startTime);
                }
                modalImg.show();
            })
            .fail(() => {
                AppUtils.showNotification('Error al cargar imagen', 'error');
                hideLoading(minDuration, startTime);
            });
    }

    function hideLoading(minDuration, startTime) {
        const elapsed = Date.now() - startTime;
        setTimeout(() => AppUtils.showLoading(false), Math.max(0, minDuration - elapsed));
    }

    if (typeof mostrarError !== 'function') {
        window.mostrarError = function (elementId, mensaje) {
            $(`#${elementId}`).text(mensaje);
        };
    }

    function limpiarErrores() {
        $('.invalid-feedback').text('');
    }

    function createActionButtons(row) {
        const actionButtons = row.situacion === 'PENDIENTE'
            ? `<button data-id="${row.id}" class="btn btn-outline-success action-approve" title="Aprobar"><i class="bi bi-check2"></i></button>
               <button data-id="${row.id}" class="btn btn-outline-danger action-cancel" title="Anular"><i class="bi bi-x-lg"></i></button>
               <button data-id="${row.id}" class="btn btn-outline-dark action-edit-pago" title="Editar Correo/Imagen" onclick="abrirModalEditarPago(${row.id})"><i class="bi bi-pencil-fill"></i></button>`
            : "";

        return `
            <div class="btn-group btn-group-sm" role="group">
                ${actionButtons}
                <button data-id="${row.id}" class="btn btn-outline-warning action-see" title="Ver imagen">
                    <i class="bi bi-eye-fill"></i>
                </button>
            </div>
        `;
    }
}); // 🚀 REPARADO: El document ready cierra aquí correctamente para dar alcance global a las funciones de abajo

function abrirModalEditarPago(idPago) {
    if (!modalEditar) {
        modalEditar = new bootstrap.Modal(document.getElementById('modalEditarPago'));
    }
    AppUtils.showLoading(true);
    document.getElementById('editArchivoVoucher').value = "";

    $.get(`/admin/pagos-digitales/api/obtener/${idPago}`)
        .done(res => {
            AppUtils.showLoading(false);
            if (res.success) {
                document.getElementById('editPagoId').value = res.data.id;
                document.getElementById('editCorreo').value = res.data.pedido?.clienteCorreo || '';
                document.getElementById('editNumDocumento').value = res.data.pedido?.numDocumento || ''; // 🚀 JALA EL DOCUMENTO
                modalEditar.show();
            }
        })
        .fail(() => {
            AppUtils.showLoading(false);
            AppUtils.showNotification('Error al cargar datos del pago', 'error');
        });
}

function guardarCambiosPago() {
    const idPago = document.getElementById('editPagoId').value;
    const correo = document.getElementById('editCorreo').value.trim();
    const numDoc = document.getElementById('editNumDocumento').value.trim(); // 🚀 LEER DOCUMENTO
    const archivoInput = document.getElementById('editArchivoVoucher');

    // Validación rápida de números
    if (numDoc && !/^[0-9]+$/.test(numDoc)) {
        AppUtils.showNotification('El documento solo debe contener números', 'error');
        return;
    }

    const ejecutarEnvio = (imagenBase64 = null) => {
        AppUtils.showLoading(true);
        $.ajax({
            url: `/admin/pagos-digitales/api/actualizar-datos/${idPago}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({
                clienteCorreo: correo,
                numDocumento: numDoc, // 🚀 VIAJA AL BACKEND
                imagenBase64: imagenBase64
            }),
            success: function (res) {
                AppUtils.showLoading(false);
                if (res.success) {
                    modalEditar.hide();
                    $('#tabla').DataTable().ajax.reload();
                    AppUtils.showNotification('Datos de facturación rectificados', 'success');
                } else {
                    AppUtils.showNotification(res.message || 'Error', 'error');
                }
            },
            error: function () {
                AppUtils.showLoading(false);
                AppUtils.showNotification('Fallo de conexión', 'error');
            }
        });
    };

    if (archivoInput.files && archivoInput.files[0]) {
        const lector = new FileReader();
        lector.onload = function (e) { ejecutarEnvio(e.target.result.split(',')[1]); };
        lector.readAsDataURL(archivoInput.files[0]);
    } else {
        ejecutarEnvio(null);
    }
}