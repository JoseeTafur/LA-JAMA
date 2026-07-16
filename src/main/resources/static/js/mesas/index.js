// =======================================================
// ESTADO GLOBAL — compartido por todos los módulos - index.js
// =======================================================
let currentMesaId     = null;
let currentMesaNumero = null;
let currentPedidoId   = null;
let mesaModal         = null;
let facturacionModal  = null;

let modoUnificacionActivo   = false;
let modoReservaMasivaActiva = false;

let modoAccionMesaActual      = null;
let mesaDestinoSeleccionadaId = null;
let instanciaModalAccion      = null;

let esPagoParcialComanda = false;
let mantenerModalMesaCerrado = false;

// =======================================================
// INICIALIZACIÓN DOM
// =======================================================
document.addEventListener('DOMContentLoaded', function () {
    const modalElement = document.getElementById('modalMesa');
    if (modalElement) mesaModal = new bootstrap.Modal(modalElement);

    const facturacionElement = document.getElementById('modalFacturacion');
    if (facturacionElement) facturacionModal = new bootstrap.Modal(facturacionElement);

    const accionMesaElement = document.getElementById('modalAccionMesa');
    if (accionMesaElement) {
        instanciaModalAccion = new bootstrap.Modal(accionMesaElement);

        accionMesaElement.addEventListener('hidden.bs.modal', function () {
            if (!mantenerModalMesaCerrado && mesaModal) {
                mesaModal.show();
            }
            mantenerModalMesaCerrado = false; // se resetea para la próxima apertura
        });
    }
});
