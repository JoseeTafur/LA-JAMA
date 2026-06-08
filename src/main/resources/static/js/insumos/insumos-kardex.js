/**
 * LA JAMA — insumos-kardex.js
 * Motor completo del Kardex: bloques paginados, filtros combinados,
 * ordenamiento por columna e inversión de flujo.
 * Depende de: insumos-core.js (variables globales de kardex)
 */

// ─── APERTURA DEL KARDEX ─────────────────────────────────────────────

async function abrirKardexPorciones(id, nombre, categoria) {

const filtrosExclusivosProteina = ['PRODUCCION', 'AJUSTE', 'VENTA'];
filtrosExclusivosProteina.forEach(filtro => {
    const btn = document.querySelector(`[data-filtro="${filtro}"]`);
    if (btn) btn.classList.toggle('d-none', categoria !== 'PROTEINA');
});

    categoriaKardexActual = categoria;

    const titulo = categoria === 'PROTEINA'
        ? `Kardex por Porciones: ${nombre}`
        : `Kardex de Ingresos: ${nombre}`;
    document.getElementById('tituloKardexPorciones').innerHTML =
        `<i class="bi bi-clock-history me-2"></i>${titulo}`;

    document.querySelectorAll('.col-merma-kardex').forEach(el => {
        el.style.display = (categoria === 'PROTEINA') ? 'table-cell' : 'none';
    });

    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (cuerpo) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Estructurando bloques indexed...</td></tr>';
    }

    // Resetear inputs de búsqueda
    if (document.getElementById('searchKardexTexto'))      document.getElementById('searchKardexTexto').value = '';
    if (document.getElementById('searchKardexFechaInicio')) document.getElementById('searchKardexFechaInicio').value = '';
    if (document.getElementById('searchKardexFechaFin'))    document.getElementById('searchKardexFechaFin').value = '';

    // Resetear botones de filtro
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.classList.remove('active', 'btn-dark', 'btn-success', 'btn-warning', 'btn-secondary', 'btn-danger');
        btn.classList.add('btn-outline-secondary');
    });
    const btnTodos = document.querySelector('[data-filtro="TODOS"]');
    if (btnTodos) {
        btnTodos.classList.add('active', 'btn-dark');
        btnTodos.classList.remove('btn-outline-secondary');
    }

    if (modalKardexPorcionesInstance) {
        modalKardexPorcionesInstance.show();
    } else {
        new bootstrap.Modal(document.getElementById('modalKardexPorciones')).show();
    }

    try {
        const res         = await fetch(`/proteinas/kardex/${id}`);
        const dataOriginal = await res.json();

        kardexData         = dataOriginal.reverse();
        kardexDataFiltrada = [...kardexData];

        paginaActualKardex = 1;
        procesarYRenderizarBloquesKardex(kardexDataFiltrada, categoria);
    } catch (e) {
        if (cuerpo) {
            cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-3">Error al compilar el historial asíncrono.</td></tr>';
        }
    }
}

// ─── FILTRO POR ORIGEN (botones del modal) ───────────────────────────

function filtrarKardex(filtro) {
    document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active'));

    const btnActivo = document.querySelector(`[data-filtro="${filtro}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    paginaActualKardex = 1;
    ejecutarFiltroCombinadoKardex();
}

// ─── FILTRO COMBINADO (texto + fechas + origen) ───────────────────────

function ejecutarFiltroCombinadoKardex() {
    const texto          = (document.getElementById('searchKardexTexto')?.value || '').toLowerCase().trim();
    const fechaInicioStr = document.getElementById('searchKardexFechaInicio')?.value || '';
    const fechaFinStr    = document.getElementById('searchKardexFechaFin')?.value || '';

    const btnActivo    = document.querySelector('.btn-filtro.active');
    const filtroOrigen = btnActivo ? btnActivo.getAttribute('data-filtro') : 'TODOS';

    const timeInicio = fechaInicioStr ? new Date(fechaInicioStr + 'T00:00:00').getTime() : null;
    const timeFin    = fechaFinStr    ? new Date(fechaFinStr    + 'T23:59:59').getTime() : null;

    kardexDataFiltrada = kardexData.filter(mov => {
        if (filtroOrigen !== 'TODOS' && mov.origen !== filtroOrigen) return false;

        if (mov.fecha) {
            const timeMov = new Date(mov.fecha).getTime();
            if (timeInicio && timeMov < timeInicio) return false;
            if (timeFin    && timeMov > timeFin)    return false;
        }

        if (texto) {
            const detalle     = (mov.detalle || mov.motivo || '').toLowerCase();
            const origenStr   = (mov.origen  || '').toLowerCase();
            const cantidadStr = (mov.cantidad || '').toString();
            if (!detalle.includes(texto) && !origenStr.includes(texto) && !cantidadStr.includes(texto)) return false;
        }
        return true;
    });

    paginaActualKardex = 1;
    procesarYRenderizarBloquesKardex(kardexDataFiltrada, categoriaKardexActual);
}

// ─── AGRUPACIÓN EN BLOQUES POR LOTE ──────────────────────────────────

function procesarYRenderizarBloquesKardex(movimientos, categoria) {
    let bloquesTemporales = [];
    let bloqueActual      = null;

    // Filtrar ajustes duplicados automáticos
    let movimientosLimpios = [];
    for (let i = 0; i < movimientos.length; i++) {
        const movActual = movimientos[i];
        const esAjuste  = (movActual.origen || movActual.motivo || '').toUpperCase() === 'AJUSTE';

        if (esAjuste && i > 0) {
            const movPrevio        = movimientos[i - 1];
            const previoEsProduccion = (movPrevio.origen || '').toUpperCase() === 'PRODUCCION';
            if (previoEsProduccion && Math.abs(movActual.cantidad) === Math.abs(movPrevio.cantidad)) {
                console.warn(`[La Jama - Auditoría] Removido registro duplicado: ${movActual.cantidad}`);
                continue;
            }
        }
        movimientosLimpios.push(movActual);
    }

    // Agrupar cronológicamente por lote
    movimientosLimpios.forEach(mov => {
        const origen       = (mov.origen || mov.motivo || '').toUpperCase();
        const esRecargaAdmin = origen.includes('LOTE') || origen.includes('ENTRADA');

        if (esRecargaAdmin || !bloqueActual) {
            if (bloqueActual) bloquesTemporales.push(bloqueActual);
            bloqueActual = {
                id: bloquesTemporales.length + 1,
                fechaLote: mov.fecha,
                movimientos: []
            };
        }
        bloqueActual.movimientos.push(mov);
    });

    if (bloqueActual) bloquesTemporales.push(bloqueActual);

    // El lote más reciente aparece primero
    bloquesKardexPaginados = bloquesTemporales.reverse();

    renderizarFilaPaginada(categoria);
}

// ─── RENDERIZADO DE BLOQUES PAGINADOS ────────────────────────────────

function renderizarFilaPaginada(categoria) {
    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (!cuerpo) return;

    if (!bloquesKardexPaginados || bloquesKardexPaginados.length === 0 ||
        bloquesKardexPaginados[0].movimientos.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="bi bi-folder-x fs-3 d-block mb-2 text-secondary"></i>No se encontraron movimientos.</td></tr>';
        removerControlesPaginacionExistentes();
        return;
    }

    const inicio         = (paginaActualKardex - 1) * maxBloquesPorPagina;
    const fin            = inicio + maxBloquesPorPagina;
    const bloquesVisibles = bloquesKardexPaginados.slice(inicio, fin);

    if (bloquesVisibles.length === 0) {
        paginaActualKardex = 1;
        renderizarFilaPaginada(categoria);
        return;
    }

    const maxIdEnHistorial = Math.max(...bloquesKardexPaginados.map(b => b.id));
    let htmlFilas = '';

    bloquesVisibles.forEach(bloque => {
        let fechaCabecera = '-';
        if (bloque.fechaLote) {
            fechaCabecera = bloque.fechaLote.includes('T')
                ? new Date(bloque.fechaLote).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : bloque.fechaLote;
        }

        const esLoteActual = (bloque.id === maxIdEnHistorial);

        htmlFilas += `
            <tr class="table-sticky-divider">
                <td colspan="6" class="ps-3 py-2 internal-block-header fw-bold">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>
                            <i class="bi bi-box-seam-fill me-2 text-jama-gold"></i>
                            AUDITORÍA DE STOCK — BLOQUE #${bloque.id}
                            ${esLoteActual ? '<span class="badge bg-danger ms-2 animate-pulse" style="font-size:0.65rem;">LOTE ACTUAL</span>' : ''}
                        </span>
                        <span class="badge bg-jama-translucid text-dark small">
                            <i class="bi bi-calendar3 me-1"></i>Apertura: ${fechaCabecera}
                        </span>
                    </div>
                </td>
            </tr>`;

        [...bloque.movimientos].reverse().forEach(mov => {
            htmlFilas += construirFilaMovimiento(mov);
        });
    });

    cuerpo.innerHTML = htmlFilas;

    document.querySelectorAll('.col-merma-kardex').forEach(el => {
        el.style.display = (categoria === 'PROTEINA') ? 'table-cell' : 'none';
    });

    inyectarControlesPaginacion(categoria);
}

// ─── RENDERIZADO PLANO (modo auditoría global) ────────────────────────

function renderizarTablaKardexPlanaDirecta() {
    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (!cuerpo) return;

    let htmlFilas = `
        <tr class="table-warning">
            <td colspan="6" class="text-center py-2 fw-bold text-dark small">
                ⚠️ VISTA DE AUDITORÍA GLOBAL ACTIVA (Ordenamiento personalizado — Bloques ocultos temporalmente)
            </td>
        </tr>`;

    kardexDataFiltrada.forEach(mov => {
        htmlFilas += construirFilaMovimiento(mov);
    });

    cuerpo.innerHTML = htmlFilas;

    document.querySelectorAll('.col-merma-kardex').forEach(el => {
        el.style.display = (categoriaKardexActual === 'PROTEINA') ? 'table-cell' : 'none';
    });

    removerControlesPaginacionExistentes();
}

// ─── CONSTRUCTOR DE FILA (reutilizable) ──────────────────────────────

function construirFilaMovimiento(mov) {
    let fecha = '-';
    if (mov.fecha) {
        fecha = mov.fecha.includes('T')
            ? new Date(mov.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : mov.fecha;
    }

    const detalle      = mov.detalle || mov.motivo || '-';
    const origen       = mov.origen  || 'LOGÍSTICA';
    const esIngreso    = mov.signo === '+' || mov.tipo === 'INGRESO';
    const signo        = esIngreso ? '+' : '-';
    const colorCantidad = esIngreso ? 'text-success' : 'text-danger';

    let cantidadTexto = '-';
    if (mov.cantidad !== undefined && mov.cantidad !== null) {
        cantidadTexto = typeof mov.cantidad === 'number' ? `${mov.cantidad} porc.` : mov.cantidad;
    }

    let stockFinal = '-';
    if (mov.stockResultante !== undefined && mov.stockResultante !== null && mov.stockResultante !== 'null' && mov.stockResultante !== '') {
        stockFinal = mov.stockResultante;
    } else if (mov.stockFinal !== undefined && mov.stockFinal !== null && mov.stockFinal !== 'null' && mov.stockFinal !== '') {
        stockFinal = mov.stockFinal;
    }

    let textoMerma = '-';
    if (mov.mermaKg !== undefined && mov.mermaKg !== null) {
        textoMerma = parseFloat(mov.mermaKg).toFixed(3);
    }

    return `
        <tr class="align-middle">
            <td class="ps-3 text-muted small">${fecha}</td>
            <td>${badgeOrigen(origen)}</td>
            <td class="fw-semibold text-secondary small">${detalle}</td>
            <td class="text-end col-merma-kardex text-danger fw-bold">${textoMerma}</td>
            <td class="text-end fw-bold ${colorCantidad}">${signo} ${cantidadTexto}</td>
            <td class="text-end pe-3 fw-bold text-dark">${stockFinal}</td>
        </tr>`;
}

// ─── BADGE DE ORIGEN ─────────────────────────────────────────────────

function badgeOrigen(origen) {
    const map = {
        'LOTE':       '<span class="badge bg-light-success text-success border px-2 py-1 rounded-pill small fw-bold">🛒 Lote</span>',
        'PRODUCCION': '<span class="badge bg-light-warning text-warning-dark border px-2 py-1 rounded-pill small fw-bold">🔥 Producción</span>',
        'AJUSTE':     '<span class="badge bg-light-secondary text-secondary border px-2 py-1 rounded-pill small fw-bold">⚙️ Ajuste</span>',
        'VENTA':      '<span class="badge bg-light-danger text-danger border px-2 py-1 rounded-pill small fw-bold">📦 Venta</span>',
        'LOGÍSTICA':  '<span class="badge bg-light border px-2 py-1 rounded-pill small text-dark">📦 Logística</span>'
    };
    const key = (origen || '').toUpperCase().trim();
    return map[key] ?? `<span class="badge bg-light border px-2 py-1 rounded-pill small text-dark">${origen}</span>`;
}

// ─── PAGINADOR ───────────────────────────────────────────────────────

function inyectarControlesPaginacion(categoria) {
    const footer = document.getElementById('nav-paginador-kardex');
    if (!footer) return;

    const totalPaginas = Math.ceil(bloquesKardexPaginados.length / maxBloquesPorPagina);
    if (totalPaginas <= 0) { footer.innerHTML = ''; return; }

    const maxBotonesVisibles = 5;
    let paginaInicio = Math.max(1, paginaActualKardex - Math.floor(maxBotonesVisibles / 2));
    let paginaFin    = paginaInicio + maxBotonesVisibles - 1;

    if (paginaFin > totalPaginas) {
        paginaFin    = totalPaginas;
        paginaInicio = Math.max(1, paginaFin - maxBotonesVisibles + 1);
    }

    let listaItems = '';
    for (let i = paginaInicio; i <= paginaFin; i++) {
        const activa       = i === paginaActualKardex ? 'btn-pag-jama-active' : 'btn-pag-jama-inactive';
        const textoBoton   = maxBloquesPorPagina === 1
            ? `Bloque ${bloquesKardexPaginados[i - 1]?.id || i}`
            : `Pág. ${i}`;
        listaItems += `
            <li class="page-item d-inline-block">
                <button class="page-link-jama-block ${activa}"
                        onclick="window.cambiarPaginaKardex(${i}, '${categoria}')">${textoBoton}</button>
            </li>`;
    }

    const bloqueVisibleActual = bloquesKardexPaginados[(paginaActualKardex - 1) * maxBloquesPorPagina]?.id || 1;

    footer.innerHTML = `
        <div class="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2 p-2 bg-light rounded-bottom-4">
            <div class="d-flex align-items-center gap-1 bg-white p-1 rounded border shadow-sm" style="max-width:190px; border-color:var(--lajama-peach) !important;">
                <span class="text-muted small ps-1 fw-bold" style="font-size:0.68rem; color:var(--lajama-green) !important;">IR AL BLOQUE:</span>
                <input type="number" id="inputDestinoBloque" min="1" max="${bloquesKardexPaginados.length}"
                       class="form-control form-control-sm text-center fw-bold border-0 p-0 text-dark"
                       style="width:40px; background:transparent;" placeholder="${bloqueVisibleActual}">
                <button type="button" class="btn btn-jama btn-sm rounded-2 py-0 px-2" style="height:24px;"
                        onclick="window.saltarABloqueManual('${categoria}', ${bloquesKardexPaginados.length})">
                    <i class="bi bi-arrow-right-short fs-5" style="line-height:0;"></i>
                </button>
            </div>
            <ul class="pagination pagination-sm justify-content-center mb-0 gap-1 flex-wrap">
                ${listaItems}
            </ul>
            <div class="text-end text-muted fw-semibold" style="font-size:0.75rem;">
                Viendo bloque inicial <span class="badge bg-dark text-white rounded-pill px-2">#${bloqueVisibleActual}</span>
                de ${bloquesKardexPaginados.length} bloques totales
            </div>
        </div>`;
}

function removerControlesPaginacionExistentes() {
    const footer = document.getElementById('nav-paginador-kardex');
    if (footer) footer.innerHTML = '';
}

// ─── NAVEGACIÓN PAGINADA (window para acceso desde HTML) ─────────────

window.cambiarPaginaKardex = function(numeroPagina, categoria) {
    paginaActualKardex = numeroPagina;
    renderizarFilaPaginada(categoria);
};

window.cambiarTamanoBloquesKardex = function(nuevoTamano) {
    maxBloquesPorPagina = parseInt(nuevoTamano);
    paginaActualKardex  = 1;
    renderizarFilaPaginada(categoriaKardexActual);
};

window.saltarABloqueManual = function(categoria, totalMaximo) {
    const input = document.getElementById('inputDestinoBloque');
    if (!input) return;

    const valor = parseInt(input.value);
    if (isNaN(valor) || valor < 1 || valor > totalMaximo) {
        AppUtils.showNotification(`Bloque inválido (1 - ${totalMaximo})`, 'error');
        input.value = '';
        return;
    }
    paginaActualKardex = totalMaximo - valor + 1;
    renderizarFilaPaginada(categoria);
};

// ─── ORDENAMIENTO POR COLUMNA ─────────────────────────────────────────

window.ordenarKardexPorColumna = function(columna) {
    if (paginaActualKardex > bloquesKardexPaginados.length) paginaActualKardex = 1;
    const bloqueActual = bloquesKardexPaginados[paginaActualKardex - 1];
    if (!bloqueActual?.movimientos?.length) return;

    ordenamientoKardexDireccion[columna] = !ordenamientoKardexDireccion[columna];
    const ordenAscendente = ordenamientoKardexDireccion[columna];

    document.querySelectorAll('#modalKardexPorciones thead th').forEach(th => {
        th.innerHTML = th.innerHTML.replace(/ 🔼| 🔽/g, '');
    });
    const thActual = document.querySelector(`#modalKardexPorciones thead th[data-sort="${columna}"]`);
    if (thActual) thActual.innerHTML += ordenAscendente ? ' 🔼' : ' 🔽';

    bloqueActual.movimientos.sort((a, b) => {
        let valA, valB;
        switch (columna) {
            case 'fecha':    valA = new Date(a.fecha || 0).getTime(); valB = new Date(b.fecha || 0).getTime(); break;
            case 'origen':   valA = (a.origen  || '').toLowerCase();  valB = (b.origen  || '').toLowerCase();  break;
            case 'detalle':  valA = (a.detalle || a.motivo || '').toLowerCase(); valB = (b.detalle || b.motivo || '').toLowerCase(); break;
            case 'merma':    valA = parseFloat(a.mermaKg) || 0;       valB = parseFloat(b.mermaKg) || 0;       break;
            case 'cantidad': valA = parseFloat(a.cantidad) || 0;      valB = parseFloat(b.cantidad) || 0;      break;
            case 'saldo':    valA = parseFloat(a.stockResultante || a.stockFinal) || 0; valB = parseFloat(b.stockResultante || b.stockFinal) || 0; break;
            default:         return 0;
        }
        if (valA < valB) return ordenAscendente ? -1 : 1;
        if (valA > valB) return ordenAscendente ?  1 : -1;
        return 0;
    });

    renderizarFilaPaginada(categoriaKardexActual);
};

// ─── INVERSIÓN DE FLUJO COMPLETO ──────────────────────────────────────

window.invertirFlujoActualKardex = function() {
    document.querySelectorAll('#modalKardexPorciones thead th').forEach(th => {
        th.innerHTML = th.innerHTML.replace(/ 🔼| 🔽/g, '');
    });
    for (let col in ordenamientoKardexDireccion) ordenamientoKardexDireccion[col] = false;

    if (bloquesKardexPaginados?.length > 0) {
        const franjaAuditoria = document.querySelector('.table-warning');

        if (franjaAuditoria) {
            kardexDataFiltrada.reverse();
            renderizarTablaKardexPlanaDirecta();
        } else {
            bloquesKardexPaginados.reverse();
            bloquesKardexPaginados.forEach(bloque => {
                if (bloque.movimientos) bloque.movimientos.reverse();
            });
            renderizarFilaPaginada(categoriaKardexActual);
        }
        AppUtils.showNotification('Sentido del historial invertido', 'success');
    }
};

// ─── INVERSIÓN SOLO DEL CONTENIDO INTERNO DEL BLOQUE ─────────────────

window.invertirSoloContenidoBloque = function() {
    document.querySelectorAll('#modalKardexPorciones thead th').forEach(th => {
        th.innerHTML = th.innerHTML.replace(/ 🔼| 🔽/g, '');
    });
    for (let col in ordenamientoKardexDireccion) ordenamientoKardexDireccion[col] = false;

    if (bloquesKardexPaginados?.length > 0) {
        bloquesKardexPaginados.forEach(bloque => {
            if (bloque.movimientos) bloque.movimientos.reverse();
        });
        renderizarFilaPaginada(categoriaKardexActual);
        AppUtils.showNotification('Historial interno del bloque invertido', 'success');
    }
};