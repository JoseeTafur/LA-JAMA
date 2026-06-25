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
