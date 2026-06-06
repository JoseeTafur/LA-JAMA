function cambiarEstadoPedido(id, accion) {
    const base = '/admin/entregas/';
    const url = accion === 'iniciar' ? `${base}iniciar/${id}` : `${base}completar/${id}`;

    // Estructuramos el flujo conversacional según la acción logística
    const configDialog = {
        title: accion === 'iniciar' ? '¿Iniciar ruta de reparto?' : '¿Confirmar entrega del pedido?',
        text: accion === 'iniciar'
            ? 'La comanda cambiará a estado EN_CAMINO y se notificará al centro de control.'
            : 'Se registrará la liquidación de la orden en la caja de La Jama.',
        icon: accion === 'iniciar' ? 'info' : 'question',
        confirmButtonColor: '#1B3A2C', // Color corporativo
        confirmButtonText: accion === 'iniciar' ? 'Sí, iniciar' : 'Sí, entregado'
    };

    AppUtils.showConfirmationDialog(configDialog, function() {
        // Bloqueamos la interfaz de la tablet/móvil por si la red 4G/5G oscila en la calle
        AppUtils.showLoading(true);

        fetch(url, { method: 'POST' })
            .then(response => {
                AppUtils.showLoading(false);
                if (response.ok) {
                    AppUtils.showNotification(
                        accion === 'iniciar' ? 'Ruta iniciada. ¡Maneja con cuidado!' : 'Orden liquidada en sistema',
                        'success'
                    );
                    // Espera sutil para que el motorizado lea el Toast antes de refrescar
                    setTimeout(() => location.reload(), 1200);
                } else {
                    AppUtils.showNotification('Error de sincronización con la base de datos', 'error');
                }
            })
            .catch(err => {
                AppUtils.showLoading(false);
                console.error("Fallo crítico en fetch de ruta:", err);
                AppUtils.showNotification('❌ Fallo de conexión. Verifica tus datos móviles.', 'error');
            });
    });
}