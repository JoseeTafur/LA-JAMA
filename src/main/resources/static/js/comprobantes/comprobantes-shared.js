/**
 * 📦 LA JAMA - SHARED: Constantes, estado y funciones compartidas entre módulos
 * Debe cargarse PRIMERO antes que comprobantes-tablas.js y comprobantes-core.js
 */

const LIMITE_COMPROBANTES_PAGINA = 15;

let estadoPaginacionComprobantes = {
    'tablaPorEmitir': { pagina: 1, infoId: 'infoPagPorEmitir',  paginadorId: 'paginadorPorEmitir'  },
    'tablaEmitidos':  { pagina: 1, infoId: 'infoPagEmitidos',   paginadorId: 'paginadorEmitidos'   },
    'tablaAnulados':  { pagina: 1, infoId: 'infoPagAnulados',   paginadorId: 'paginadorAnulados'   },
};

document.addEventListener('DOMContentLoaded', function () {
    const txtBusqueda  = document.getElementById('filtroCpeTexto');
    const fechaInicio  = document.getElementById('filtroCpeFechaInicio');
    const fechaFin     = document.getElementById('filtroCpeFechaFin');
    const selectMetodo = document.getElementById('filtroCpeMetodo');
    const selectOrigen = document.getElementById('filtroCpeOrigen');

    if (txtBusqueda && fechaInicio && fechaFin && selectMetodo && selectOrigen) {
        txtBusqueda.addEventListener('keyup',   window.ejecutarFiltroCruzadoComprobantes);
        fechaInicio.addEventListener('change', window.aplicarFiltroPorFecha);
        fechaFin.addEventListener('change',    window.aplicarFiltroPorFecha);
        selectMetodo.addEventListener('change', window.ejecutarFiltroCruzadoComprobantes);
        selectOrigen.addEventListener('change', window.ejecutarFiltroCruzadoComprobantes);
    }

    if (window.repaginarTodas) window.repaginarTodas();
});

function badgeMetodoPago(metodo) {
    const m = (metodo || 'EFECTIVO').toUpperCase();
    if (m === 'EFECTIVO') return `<span class="badge-metodo-jama bm-efectivo"><img src="/img/Efectivo.png" alt="Efectivo" style="width:13px;height:13px;object-fit:contain;"> Efectivo</span>`;
    if (m === 'YAPE')     return `<span class="badge-metodo-jama bm-digital"><img src="/img/Yape.png" alt="Yape" style="width:13px;height:13px;object-fit:contain;"> Yape</span>`;
    if (m === 'PLIN')     return `<span class="badge-metodo-jama bm-plin"><img src="/img/Plin.png" alt="Plin" style="width:13px;height:13px;object-fit:contain;"> Plin</span>`;
    if (m === 'TARJETA')  return `<span class="badge-metodo-jama bm-tarjeta"><img src="/img/Tarjeta.png" alt="Tarjeta" style="width:13px;height:13px;object-fit:contain;"> Tarjeta</span>`;
    return `<span class="badge-metodo-jama bm-digital"><img src="/img/YapePlin.png" alt="Yape/Plin" style="width:13px;height:13px;object-fit:contain;"> Yape/Plin</span>`;
}

function ejecutarPaginacionComprobantes(tablaId) {
    const config      = estadoPaginacionComprobantes[tablaId]; if (!config) return;
    const tabla       = document.getElementById(tablaId);
    const infoSpan    = document.getElementById(config.infoId);
    const paginadorUl = document.getElementById(config.paginadorId);
    if (!tabla || !infoSpan || !paginadorUl) return;

    const filas = Array.from(tabla.querySelectorAll('tbody tr')).filter(tr =>
        !tr.id?.startsWith('desglose-anulado-') &&
        !tr.classList.contains('fila-vacia-jama') &&
        tr.getAttribute('data-filtrado-oculto') !== 'true'
    );

    const total        = filas.length;
    const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_COMPROBANTES_PAGINA));

    if (config.pagina > totalPaginas) config.pagina = totalPaginas;
    if (config.pagina < 1)            config.pagina = 1;

    tabla.querySelectorAll('tbody tr').forEach(tr => {
        if (!tr.id?.startsWith('desglose-anulado-') && !tr.classList.contains('fila-vacia-jama')) {
            tr.setAttribute('data-pag-oculto', 'true');
            tr.style.setProperty('display', 'none', 'important');
        }
    });

    const inicio = (config.pagina - 1) * LIMITE_COMPROBANTES_PAGINA;
    const fin    = Math.min(inicio + LIMITE_COMPROBANTES_PAGINA, total);

    for (let i = inicio; i < fin; i++) {
        if (filas[i]) {
            filas[i].removeAttribute('data-pag-oculto');
            filas[i].style.removeProperty('display');
            const siguiente = filas[i].nextElementSibling;
            if (siguiente?.id?.startsWith('desglose-anulado-')) {
                siguiente.style.removeProperty('display');
            }
        }
    }

    infoSpan.innerText = total === 0 ? 'Mostrando 0 registros' : `Mostrando ${inicio + 1}–${fin} de ${total} registros`;
    paginadorUl.innerHTML = '';

    const liPrev = document.createElement('li');
    liPrev.className = `page-item-jama ${config.pagina === 1 ? 'disabled' : ''}`;
    liPrev.innerHTML = `<button type="button" class="page-link-jama">Anterior</button>`;
    liPrev.onclick = () => { if (config.pagina > 1) { config.pagina--; ejecutarPaginacionComprobantes(tablaId); } };
    paginadorUl.appendChild(liPrev);

    const rango = 2;
    for (let p = 1; p <= totalPaginas; p++) {
        if (p === 1 || p === totalPaginas || Math.abs(p - config.pagina) <= rango) {
            const liPag = document.createElement('li');
            liPag.className = `page-item-jama ${p === config.pagina ? 'active' : ''}`;
            liPag.innerHTML = `<button type="button" class="page-link-jama">${p}</button>`;
            liPag.onclick   = () => { config.pagina = p; ejecutarPaginacionComprobantes(tablaId); };
            paginadorUl.appendChild(liPag);
        }
    }

    const liNext = document.createElement('li');
    liNext.className = `page-item-jama ${config.pagina === totalPaginas ? 'disabled' : ''}`;
    liNext.innerHTML = `<button type="button" class="page-link-jama">Siguiente</button>`;
    liNext.onclick = () => { if (config.pagina < totalPaginas) { config.pagina++; ejecutarPaginacionComprobantes(tablaId); } };
    paginadorUl.appendChild(liNext);
}

function repaginarTodas() {
    Object.keys(estadoPaginacionComprobantes).forEach(id => {
        estadoPaginacionComprobantes[id].pagina = 1;
        ejecutarPaginacionComprobantes(id);
    });
    if (window.actualizarMensajesVacios) window.actualizarMensajesVacios();
}

window.badgeMetodoPago = badgeMetodoPago;
window.ejecutarPaginacionComprobantes = ejecutarPaginacionComprobantes;
window.repaginarTodas = repaginarTodas;