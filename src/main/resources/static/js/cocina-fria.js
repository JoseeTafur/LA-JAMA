function updateTimers() {
    document.querySelectorAll('.timer-container').forEach(container => {
        const startAttr = container.getAttribute('data-start');
        if (!startAttr) return;

        const startTime = new Date(startAttr);
        const now = new Date();
        const diff = Math.floor((now - startTime) / 1000);

        const mins = Math.floor(diff / 60).toString().padStart(2, '0');
        const secs = (diff % 60).toString().padStart(2, '0');

        const display = container.querySelector('.timer-display');
        if (display) display.innerText = `${mins}:${secs}`;

        if (diff > 600) {
            container.classList.add('timer-urgent');
        } else {
            container.classList.remove('timer-urgent');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar cronómetros de cocina
    setInterval(updateTimers, 1000);
    updateTimers();

    // --- INTERCEPTOR DE DESPACHO INTERACTIVO CON APPUTILS ---
    const formulariosDespachar = document.querySelectorAll('.form-despachar');

    formulariosDespachar.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Detenemos el submit inmediato e involuntario

            const pedidoId = form.querySelector('input[name="pedidoId"]').value;

            AppUtils.showConfirmationDialog({
                title: '¿Despachar de Barra Fría?',
                text: `¿Confirmas que los platos fríos de la Orden #${pedidoId} están listos para ser servidos?`,
                icon: 'question',
                confirmButtonColor: '#1B3A2C', // Color institucional
                confirmButtonText: 'Sí, despachar'
            }, function() {
                // Activa pantalla de carga para evitar colisiones por clics rápidos
                AppUtils.showLoading(true);
                form.submit();
            });
        });
    });

    // Auto-recarga del monitor cada 45 segundos para refrescar nuevas comandas del salón
    setTimeout(() => {
        console.log("Recargando monitor de cocina fría..."); // Corregido el log descriptivo
        location.reload();
    }, 45000);
});