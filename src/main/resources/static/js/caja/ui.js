// ============================================================================
// CAJA - ESTADO, PESTAÑAS, PAGINACIÓN Y FILTROS
// ============================================================================

const LIMITE_ITEMS_PAGINA = 15;
const registrosPorPagina  = 8;

let selectedPedidoId          = null;
let paginaActual              = 1;
let paginaActualComprobantes  = 0;
let datosPedidoActualCaja     = null;

let estadoPaginacionCaja = {
    'panel-por-cobrar':        { pagina: 1, tablaId: 'tablaPorCobrarLocal',               infoId: 'infoPagPorCobrar',   paginadorId: 'paginadorPorCobrar'   },
    'panel-liquidados':        { pagina: 1, tablaId: 'tablaHistorialLiquidadosTurno',     infoId: 'infoPagLiquidados',  paginadorId: 'paginadorLiquidados'  },
    'panel-movimientos-turno': { pagina: 1, tablaId: 'panel-movimientos-turno',           infoId: 'infoPagMovimientos', paginadorId: 'paginadorMovimientos' }
};

function cambiarPestañaCaja(idPanel, boton) {
    document.querySelectorAll('.jama-tab-panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.jama-tab-link').forEach(b => b.classList.remove('activo'));
    const panel = document.getElementById(idPanel);
    if (panel) panel.classList.add('activo');
    if (boton && boton.classList.contains('jama-tab-link')) boton.classList.add('activo');
}

function abrirModalLocal(id) {
    const modalElement = document.getElementById(id);
    if (!modalElement) return;
    let modalBootstrap = bootstrap.Modal.getInstance(modalElement);
    if (!modalBootstrap) modalBootstrap = new bootstrap.Modal(modalElement);
    modalBootstrap.show();
}

function cerrarModalLocal(id) {
    const modalElement = document.getElementById(id);
    if (!modalElement) return;
    const modalBootstrap = bootstrap.Modal.getInstance(modalElement);
    if (modalBootstrap) modalBootstrap.hide();
}

function abrirModal(id) { abrirModalLocal(id); }
function cerrarModal(id) { cerrarModalLocal(id); }

function ejecutarPaginacionUnificadaCaja(panelKey) {
    const config = estadoPaginacionCaja[panelKey];
    if (!config) return;

    const contenedorPanel = document.getElementById(panelKey);
    if (!contenedorPanel) return;

    const tabla       = contenedorPanel.querySelector('table');
    const infoSpan    = document.getElementById(config.infoId);
    const paginadorUl = document.getElementById(config.paginadorId);
    if (!tabla || !infoSpan || !paginadorUl) return;

    const filas = Array.from(tabla.querySelectorAll('tbody tr')).filter(tr =>
        tr.classList.contains('fila-pedido-caja') && tr.getAttribute('data-excluido-filtro') !== 'true'
    );

    const totalRegistros = filas.length;
    const totalPaginas   = Math.ceil(totalRegistros / LIMITE_ITEMS_PAGINA) || 1;

    config.pagina = Math.min(Math.max(config.pagina, 1), totalPaginas);

    tabla.querySelectorAll('tbody tr.fila-pedido-caja').forEach(f => f.style.setProperty('display', 'none', 'important'));

    const inicio = (config.pagina - 1) * LIMITE_ITEMS_PAGINA;
    const fin    = Math.min(inicio + LIMITE_ITEMS_PAGINA, totalRegistros);
    for (let i = inicio; i < fin; i++) {
        if (filas[i]) filas[i].style.removeProperty('display');
    }

    infoSpan.innerText = totalRegistros === 0
        ? "Mostrando 0 registros"
        : `Mostrando del ${inicio + 1} al ${fin} de ${totalRegistros} registros`;

    paginadorUl.innerHTML = '';

    const liPrev = document.createElement('li');
    liPrev.className = `page-item-jama ${config.pagina === 1 ? 'disabled' : ''}`;
    liPrev.innerHTML = `<button type="button" class="page-link-jama">Anterior</button>`;
    liPrev.onclick = () => { if (config.pagina > 1) { config.pagina--; ejecutarPaginacionUnificadaCaja(panelKey); } };
    paginadorUl.appendChild(liPrev);

    for (let p = 1; p <= totalPaginas; p++) {
        const liPag = document.createElement('li');
        liPag.className = `page-item-jama ${p === config.pagina ? 'active' : ''}`;
        liPag.innerHTML = `<button type="button" class="page-link-jama">${p}</button>`;
        liPag.onclick = () => { config.pagina = p; ejecutarPaginacionUnificadaCaja(panelKey); };
        paginadorUl.appendChild(liPag);
    }

    const liNext = document.createElement('li');
    liNext.className = `page-item-jama ${config.pagina === totalPaginas ? 'disabled' : ''}`;
    liNext.innerHTML = `<button type="button" class="page-link-jama">Siguiente</button>`;
    liNext.onclick = () => { if (config.pagina < totalPaginas) { config.pagina++; ejecutarPaginacionUnificadaCaja(panelKey); } };
    paginadorUl.appendChild(liNext);
}

function ejecutarFiltradoHistorialEnCaliente() {
    const textoInput  = document.getElementById('filtroAsincronoTexto').value.toLowerCase();
    const metodoInput = document.getElementById('filtroAsincronoMetodo').value;
    const origenInput = document.getElementById('filtroAsincronoOrigen').value;

    const tabla = document.getElementById('tablaHistorialLiquidadosTurno');
    if (!tabla) return;

    tabla.querySelectorAll('tbody tr.fila-pedido-caja').forEach(fila => {
        const contenidoFila = fila.textContent.toLowerCase();

        let metodoFila = 'EFECTIVO';
        if (fila.querySelector('.bm-tarjeta'))     metodoFila = 'TARJETA';
        else if (fila.querySelector('.bm-digital')) metodoFila = 'YAPE';

        let origenFila = 'DELIVERY';
        if (contenidoFila.includes('salón') || contenidoFila.includes('salon')) origenFila = 'SALON';

        const coincideTexto  = contenidoFila.includes(textoInput);
        const coincideMetodo = (metodoInput === 'TODOS' || metodoFila === metodoInput);
        const coincideOrigen = (origenInput === 'TODOS' || origenFila === origenInput);

        if (coincideTexto && coincideMetodo && coincideOrigen) {
            fila.removeAttribute('data-excluido-filtro');
        } else {
            fila.setAttribute('data-excluido-filtro', 'true');
        }
    });

    estadoPaginacionCaja['panel-liquidados'].pagina = 1;
    ejecutarPaginacionUnificadaCaja('panel-liquidados');
}

function limpiarFiltrosHistorialAsincrono() {
    document.getElementById('filtroAsincronoTexto').value  = '';
    document.getElementById('filtroAsincronoMetodo').value = 'TODOS';
    document.getElementById('filtroAsincronoOrigen').value = 'TODOS';
    ejecutarFiltradoHistorialEnCaliente();
    AppUtils.showNotification("Filtros contables restaurados", "success");
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('param-aprobado')) AppUtils.showNotification("Pedido enviado a cocina.", "success");
    if (document.getElementById('param-success'))  AppUtils.showNotification("¡Cobro cuadrado e ingreso registrado!", "success");

    const buscador       = document.getElementById('buscadorPedido');
    const tablaPorCobrar = document.getElementById('tablaPorCobrarLocal')?.getElementsByTagName('tbody')[0];

    if (buscador && tablaPorCobrar) {
        buscador.addEventListener('keyup', function () {
            const texto = buscador.value.toLowerCase();
            Array.from(tablaPorCobrar.getElementsByTagName('tr')).forEach(fila => {
                if (fila.classList.contains('fila-pedido-caja')) {
                    if (fila.textContent.toLowerCase().includes(texto)) {
                        fila.removeAttribute('data-excluido-filtro');
                    } else {
                        fila.setAttribute('data-excluido-filtro', 'true');
                    }
                }
            });
            estadoPaginacionCaja['panel-por-cobrar'].pagina = 1;
            ejecutarPaginacionUnificadaCaja('panel-por-cobrar');
        });
    }

    const txtBusqueda  = document.getElementById('filtroAsincronoTexto');
    const selectMetodo = document.getElementById('filtroAsincronoMetodo');
    const selectOrigen = document.getElementById('filtroAsincronoOrigen');
    if (txtBusqueda && selectMetodo && selectOrigen) {
        txtBusqueda.addEventListener('keyup', ejecutarFiltradoHistorialEnCaliente);
        selectMetodo.addEventListener('change', ejecutarFiltradoHistorialEnCaliente);
        selectOrigen.addEventListener('change', ejecutarFiltradoHistorialEnCaliente);
    }

    ejecutarPaginacionUnificadaCaja('panel-por-cobrar');
    ejecutarPaginacionUnificadaCaja('panel-liquidados');
    ejecutarPaginacionUnificadaCaja('panel-movimientos-turno');
});
