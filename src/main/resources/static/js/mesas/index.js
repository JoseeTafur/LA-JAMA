// =======================================================
// ESTADO GLOBAL — compartido por todos los módulos
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

// =======================================================
// INICIALIZACIÓN DOM
// =======================================================
document.addEventListener('DOMContentLoaded', function () {
    const modalElement = document.getElementById('modalMesa');
    if (modalElement) mesaModal = new bootstrap.Modal(modalElement);

    const facturacionElement = document.getElementById('modalFacturacion');
    if (facturacionElement) facturacionModal = new bootstrap.Modal(facturacionElement);

    const accionMesaElement = document.getElementById('modalAccionMesa');
    if (accionMesaElement) instanciaModalAccion = new bootstrap.Modal(accionMesaElement);
});
