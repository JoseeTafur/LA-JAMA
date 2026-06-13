/**
 * LA JAMA — insumos-kardex.js
 * Motor completo del Kardex con separación de flujos y bloques orientados a Lotes.
 */

async function abrirKardexPorciones(id, nombre, categoria, unidadMedida) {
    categoriaKardexActual = categoria;
    paginaActualKardex = 1;

    const esProteina = (categoria === 'PROTEINA');
    const unidadReal = unidadMedida ? unidadMedida : 'unidades';

    document.querySelectorAll('.btn-filtro').forEach(btn => {
        const filtro = btn.getAttribute('data-filtro');
        if (['PRODUCCION', 'VENTA'].includes(filtro)) {
            btn.classList.toggle('d-none', !esProteina);
        }
    });

    const cabecera = document.getElementById('cabeceraKardexDinamica');
    if (cabecera) {
        cabecera.innerHTML = esProteina
            ? `<th class="ps-3">Fecha</th><th>Origen</th><th>Detalle</th><th class="text-end">Merma (Kg)</th><th class="text-end">Porciones</th><th class="text-end pe-3">Saldo</th>`
            : `<th class="ps-3">Fecha</th><th>Origen</th><th>Detalle</th><th class="text-end">Cantidad (${unidadReal})</th><th class="text-end pe-3">Saldo Actual</th>`;
    }

    const tituloId = document.getElementById('tituloKardexPorciones');
    if (tituloId) {
        tituloId.innerHTML = esProteina
            ? `<i class="bi bi-clock-history me-2 text-warning"></i>Kardex por Porciones: <span class="text-warning">${nombre}</span>`
            : `<i class="bi bi-clock-history me-2 text-info"></i>Historial de Movimientos: <span class="text-info">${nombre}</span>`;
    }

    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (cuerpo) cuerpo.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-success me-2"></div>Cargando registros históricos...</td></tr>';

    if (document.getElementById('searchKardexTexto')) document.getElementById('searchKardexTexto').value = '';
    if (document.getElementById('searchKardexFechaInicio')) document.getElementById('searchKardexFechaInicio').value = '';
    if (document.getElementById('searchKardexFechaFin')) document.getElementById('searchKardexFechaFin').value = '';

    document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active', 'btn-dark'));
    document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.add('btn-outline-secondary'));
    const btnTodos = document.querySelector('[data-filtro="TODOS"]');
    if (btnTodos) { btnTodos.classList.add('active', 'btn-dark'); btnTodos.classList.remove('btn-outline-secondary'); }

    if (modalKardexPorcionesInstance) modalKardexPorcionesInstance.show();

    try {
        const urlEndpoint = esProteina ? `/proteinas/kardex/${id}` : `/insumos/kardex/${id}`;
        const res = await fetch(urlEndpoint);
        const dataOriginal = await res.json();

        // 🌟 REGLA DE INTEGRIDAD: Ordenamos la data de más antigua a más reciente para armar los bloques de abajo hacia arriba
        kardexData = dataOriginal.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        kardexDataFiltrada = [...kardexData];

        ejecutarFiltroCombinadoKardex();
    } catch (e) {
        console.error(e);
        if (cuerpo) cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-3">Error al compilar el historial asíncrono.</td></tr>';
    }
}

function filtrarKardex(filtro) {
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.classList.remove('active', 'btn-dark');
        btn.classList.add('btn-outline-secondary');
    });
    const btnActivo = document.querySelector(`[data-filtro="${filtro}"]`);
    if (btnActivo) {
        btnActivo.classList.add('active', 'btn-dark');
        btnActivo.classList.remove('btn-outline-secondary');
    }
    paginaActualKardex = 1;
    ejecutarFiltroCombinadoKardex();
}

function ejecutarFiltroCombinadoKardex() {
    const texto = (document.getElementById('searchKardexTexto')?.value || '').toLowerCase().trim();
    const fechaInicioStr = document.getElementById('searchKardexFechaInicio')?.value || '';
    const fechaFinStr = document.getElementById('searchKardexFechaFin')?.value || '';
    const btnActivo = document.querySelector('.btn-filtro.active');
    const filtroOrigen = btnActivo ? btnActivo.getAttribute('data-filtro') : 'TODOS';

    const timeInicio = fechaInicioStr ? new Date(fechaInicioStr + 'T00:00:00').getTime() : null;
    const timeFin = fechaFinStr ? new Date(fechaFinStr + 'T23:59:59').getTime() : null;

    kardexDataFiltrada = kardexData.filter(mov => {
        const origenMv = (mov.origen || mov.tipo || '').toUpperCase();
        if (filtroOrigen !== 'TODOS' && !origenMv.includes(filtroOrigen)) return false;

        if (mov.fecha) {
            const timeMov = new Date(mov.fecha).getTime();
            if (timeInicio && timeMov < timeInicio) return false;
            if (timeFin && timeMov > timeFin) return false;
        }

        if (texto) {
            const detalle = (mov.detalle || mov.motivo || '').toLowerCase();
            const origenStr = (mov.origen || mov.tipo || '').toLowerCase();
            if (!detalle.includes(texto) && !origenStr.includes(texto)) return false;
        }
        return true;
    });

    procesarYRenderizarBloquesKardex();
}

function procesarYRenderizarBloquesKardex() {
    let bloquesTemporales = [];
    let bloqueActual = null;
    const esProteina = (categoriaKardexActual === 'PROTEINA');

    movimientosLimpios.forEach(mov => {
            const origen = (mov.origen || mov.tipo || '').toUpperCase();
            const motivo = (mov.motivo || mov.detalle || '').toUpperCase();

            // 🌟 CONDICIONAL INTEGRADO: Agrupa por lote de forma inteligente
            const esNuevoLote = esProteina
                ? (origen.includes('LOTE') || origen.includes('ENTRADA') || origen.includes('INGRESO'))
                : (origen === 'INGRESO' || motivo.includes('LOTE') || motivo.includes('COMPRA') || motivo.includes('APERTURA'));

            if (esNuevoLote || !bloqueActual) {
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
        bloquesKardexPaginados = bloquesTemporales.reverse();
        renderizarFilaPaginada(categoria);
    }

function renderizarKardexPorFilas() {
    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (!cuerpo) return;

    if (bloquesKardexPaginados.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted bg-light-jama">
            <div class="d-flex flex-column align-items-center justify-content-center gap-2">
                <i class="bi bi-folder-x fs-2" style="color: var(--lajama-skin);"></i>
                <span class="fw-semibold small" style="color: var(--lajama-green);">No se registraron movimientos en este rango</span>
            </div>
        </td></tr>`;
        actualizarFooterKardex(0, 0, 0, 1);
        return;
    }

    const totalPaginas = bloquesKardexPaginados.length;
    if (paginaActualKardex > totalPaginas) paginaActualKardex = 1;

    const bloqueVisible = bloquesKardexPaginados[paginaActualKardex - 1];
    let htmlFilas = '';

    if (bloqueVisible) {
        let fechaCabecera = '-';
        if (bloqueVisible.fechaLote) {
            fechaCabecera = new Date(bloqueVisible.fechaLote).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        const esLoteActual = (paginaActualKardex === 1);

        htmlFilas += `
            <tr class="table-sticky-divider">
                <td colspan="6" class="ps-3 py-2 internal-block-header fw-bold">
                    <div class="d-flex justify-content-between align-items-center">
                        <span>
                            <i class="bi bi-box-seam-fill me-2 text-jama-gold"></i>
                            AUDITORÍA DE STOCK — BLOQUE #${bloqueVisible.id}
                            ${esLoteActual ? '<span class="badge bg-danger ms-2 animate-pulse" style="font-size:0.65rem;">LOTE OPERATIVO</span>' : ''}
                        </span>
                        <span class="badge bg-jama-translucid text-dark small">
                            <i class="bi bi-calendar3 me-1"></i>Apertura: ${fechaCabecera}
                        </span>
                    </div>
                </td>
            </tr>`;

        [...bloqueVisible.movimientos].forEach(mov => {
            let fecha = mov.fecha || '-';
            if (fecha.includes('T')) {
                fecha = new Date(fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            }

            const detalle = mov.detalle || mov.motivo || '-';
            const origen = mov.origen || mov.tipo || 'LOGÍSTICA';
            const esIngreso = mov.signo === '+' || (mov.tipo && mov.tipo.toUpperCase() === 'INGRESO') || (mov.motivo && mov.motivo.toUpperCase().includes('INGRESO'));
            const signo = esIngreso ? '+' : '-';
            const colorCantidad = esIngreso ? 'text-success' : 'text-danger';
            const stockFinal = mov.stockResultante !== undefined ? mov.stockResultante : '-';

            if (categoriaKardexActual === 'PROTEINA') {
                let textoMerma = '0.000 kg';
                let claseColorMerma = 'text-muted';

                const campoMerma = mov.mermaKg !== undefined ? mov.mermaKg : mov.merma;
                if (campoMerma !== undefined && campoMerma !== null) {
                    const valorMerma = parseFloat(campoMerma);
                    textoMerma = `${valorMerma.toFixed(3)} kg`;
                    if (valorMerma > 0) {
                        claseColorMerma = 'text-danger fw-bold';
                    }
                }

                const cantidadText = typeof mov.cantidad === 'number' ? `${mov.cantidad} porc.` : mov.cantidad;

                htmlFilas += `
                    <tr class="align-middle">
                        <td class="ps-3 text-muted small">${fecha}</td>
                        <td>${badgeOrigen(origen)}</td>
                        <td class="fw-semibold text-secondary small">${detalle}</td>
                        <td class="text-end col-merma-kardex ${claseColorMerma}">${textoMerma}</td>
                        <td class="text-end fw-bold ${colorCantidad}">${signo} ${cantidadText}</td>
                        <td class="text-end pe-3 fw-bold text-dark">${stockFinal}</td>
                    </tr>`;
            } else {
                const cantidadText = typeof mov.cantidad === 'number' ? `${mov.cantidad}` : mov.cantidad;
                htmlFilas += `
                    <tr class="align-middle">
                        <td class="ps-3 text-muted small">${fecha}</td>
                        <td>${badgeOrigen(origen)}</td>
                        <td class="fw-semibold text-secondary small">${detalle}</td>
                        <td class="text-end fw-bold ${colorCantidad}">${signo} ${cantidadText}</td>
                        <td class="text-end pe-3 fw-bold text-dark">${stockFinal}</td>
                    </tr>`;
            }
        });
    }

    cuerpo.innerHTML = htmlFilas;

    // 🌟 FORZAMOS EL AJUSTE EN CALIENTE DE LA VISIBILIDAD DE LA COLUMNA DE MERMAS
    document.querySelectorAll('.col-merma-kardex').forEach(el => {
        el.style.display = (categoriaKardexActual === 'PROTEINA') ? 'table-cell' : 'none';
    });

    actualizarFooterKardex(paginaActualKardex, totalPaginas, bloqueVisible ? bloqueVisible.movimientos.length : 0);
}


function actualizarFooterKardex(pagActual, totalPaginas, totalFilasBloque) {
    const footer = document.getElementById('nav-paginador-kardex');
    if (!footer) return;

    let listaBotones = '';

    listaBotones += `<li class="page-item-jama ${pagActual === 1 ? 'disabled' : ''}">
        <button class="page-link-jama" onclick="cambiarPaginaKardexNav(${pagActual - 1})">ANTERIOR</button>
    </li>`;

    for (let i = 1; i <= totalPaginas; i++) {
        listaBotones += `<li class="page-item-jama ${pagActual === i ? 'active' : ''}">
            <button class="page-link-jama" onclick="cambiarPaginaKardexNav(${i})">${i}</button>
        </li>`;
    }

    listaBotones += `<li class="page-item-jama ${pagActual === totalPaginas ? 'disabled' : ''}">
        <button class="page-link-jama" onclick="cambiarPaginaKardexNav(${pagActual + 1})">SIGUIENTE</button>
    </li>`;

    // 🌟 INYECCIÓN EN CALIENTE DE ESTILOS PARA NAV SECUNDARIO
    footer.innerHTML = `
        <style>
            .jama-table-controls {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
            }
            .pagination-sm, .jama-pagination-wrapper {
                list-style: none !important;
                padding: 0 !important;
                margin: 0 !important;
                display: flex !important;
                align-items: center;
                gap: 6px !important;
            }
            .page-link-jama-block,
            .page-link-jama {
                background-color: var(--lajama-white, #FFFFFF) !important;
                color: var(--lajama-green, #1B3A2C) !important;
                border: 1px solid var(--lajama-peach, #EAD9C9) !important;
                padding: 6px 14px !important;
                font-size: 0.75rem !important;
                font-weight: 700 !important;
                text-transform: uppercase;
                border-radius: 8px !important;
                cursor: pointer;
                transition: all 0.2s ease;
                outline: none !important;
                box-shadow: none !important;
                display: inline-block;
            }
            .page-link-jama-block:hover,
            .page-link-jama:hover {
                background-color: var(--lajama-skin, #F4EBE1) !important;
                color: var(--lajama-green-hover, #11251C) !important;
                border-color: var(--lajama-gold, #D4A373) !important;
            }
            .btn-pag-jama-active,
            .page-link-jama-block.btn-pag-jama-active,
            .page-item-jama.active .page-link-jama {
                background-color: var(--lajama-green, #1B3A2C) !important;
                color: var(--lajama-cream, #FBF9F4) !important;
                border-color: var(--lajama-green, #1B3A2C) !important;
                box-shadow: var(--shadow-sm, 0 2px 8px rgba(27,58,44,0.04)) !important;
            }
        </style>

        <div class="jama-table-controls w-100 px-2">
            <div class="text-muted small fw-semibold">
                Viendo Bloque de Auditoría <span class="badge bg-dark text-white rounded-pill px-2">#${bloquesKardexPaginados[pagActual - 1]?.id || pagActual}</span> con ${totalFilasBloque} transacciones internas
            </div>
            <ul class="jama-pagination-wrapper mb-0">
                ${listaBotones}
            </ul>
        </div>`;
}

function cambiarPaginaKardexNav(numPag) {
    paginaActualKardex = numPag;
    renderizarKardexPorFilas();
}

function invertirFlujoActualKardex() {
    // Invierte el orden de los bloques en las páginas
    bloquesKardexPaginados.reverse();
    paginaActualKardex = 1;
    renderizarKardexPorFilas();
    AppUtils.showNotification('Sentido de bloques invertido', 'success');
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
    const esProduccion = (mov.origen === 'PRODUCCION' || (mov.motivo && mov.motivo.includes('PRODUCCION')));
    const claseFila = esProduccion ? 'fila-produccion' : '';
    let fecha = '-';
    if (mov.fecha) {
        fecha = mov.fecha.includes('T')
            ? new Date(mov.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : mov.fecha;
    }

    const detalle      = mov.detalle || mov.motivo || '-';
    const origen       = mov.origen  || 'LOGÍSTICA';
    const esIngreso    = mov.signo === '+' || mov.tipo === 'INGRESO' || (mov.motivo && mov.motivo.toUpperCase().includes('INGRESO'));
    const signo        = esIngreso ? '+' : '-';
    const colorCantidad = esIngreso ? 'text-success' : 'text-danger';

    let stockFinal = mov.stockResultante !== undefined && mov.stockResultante !== null ? mov.stockResultante : (mov.stockFinal || '-');

    // 📊 VALIDACIÓN CRÍTICA DE IDENTIDAD DE INSUMO
    if (categoriaKardexActual === 'PROTEINA') {
        // Formato para proteínas (Porciones y Mermas activas)
        let cantidadTexto = typeof mov.cantidad === 'number' ? `${mov.cantidad} porc.` : mov.cantidad;
        let textoMerma = '0.000 kg';
        let claseColorMerma = 'text-muted';

        const campoMerma = mov.mermaKg !== undefined ? mov.mermaKg : mov.merma;
        if (campoMerma !== undefined && campoMerma !== null) {
            const valorMerma = parseFloat(campoMerma);
            textoMerma = valorMerma.toFixed(3) + ' kg';
            if (valorMerma > 0) claseColorMerma = 'text-danger fw-bold';
        }

        return `
            <tr class="align-middle ${claseFila}">
                <td class="ps-3 text-muted small">${fecha}</td>
                <td>${badgeOrigen(origen)}</td>
                <td class="fw-semibold text-secondary small">${detalle}</td>
                <td class="text-end col-merma-kardex ${claseColorMerma}">${textoMerma}</td>
                <td class="text-end fw-bold ${colorCantidad}">${signo} ${cantidadTexto}</td>
                <td class="text-end pe-3 fw-bold text-dark">${stockFinal}</td>
            </tr>`;
    } else {
        // 🛒 CASO GENERAL (Arroz, Vegetales, Bebidas, etc.): Stock limpio sin "porc."
        const cantidadText = typeof mov.cantidad === 'number' ? `${mov.cantidad.toFixed(2)}` : mov.cantidad;
        const stockFinalFormateado = typeof stockFinal === 'number' ? stockFinal.toFixed(2) : stockFinal;

        return `
            <tr class="align-middle">
                <td class="ps-3 text-muted small">${fecha}</td>
                <td>${badgeOrigen(origen)}</td>
                <td class="fw-semibold text-secondary small">${detalle}</td>
                <td class="text-end fw-bold ${colorCantidad}">${signo} ${cantidadText}</td>
                <td class="text-end pe-3 fw-bold text-dark">${stockFinalFormateado}</td>
            </tr>`;
    }
}

// ─── BADGE DE ORIGEN ─────────────────────────────────────────────────

function badgeOrigen(origen) {
    const map = {
        'LOTE':       '<span class="badge bg-light-success text-success border px-2 py-1 rounded-pill small fw-bold">🛒 Lote</span>',
        'PRODUCCION': '<span class="badge bg-light-warning border px-2 py-1 rounded-pill small fw-bold" style="color:#94600E">🔥 Producción</span>',
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

    // 🌟 INYECCIÓN EN CALIENTE DE ESTILOS PARA BLOQUES
    footer.innerHTML = `
            <style>
                .jama-table-controls {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                }
                .pagination-sm, .jama-pagination-wrapper {
                    list-style: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    display: flex !important;
                    align-items: center;
                    gap: 6px !important;
                }
                .page-link-jama-block,
                .page-link-jama {
                    background-color: var(--lajama-white, #FFFFFF) !important;
                    color: var(--lajama-green, #1B3A2C) !important;
                    border: 1px solid var(--lajama-peach, #EAD9C9) !important;
                    padding: 6px 14px !important;
                    font-size: 0.75rem !important;
                    font-weight: 700 !important;
                    text-transform: uppercase;
                    border-radius: 8px !important;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    outline: none !important;
                    box-shadow: none !important;
                    display: inline-block;
                }
                .page-link-jama-block:hover,
                .page-link-jama:hover {
                    background-color: var(--lajama-skin, #F4EBE1) !important;
                    color: var(--lajama-green-hover, #11251C) !important;
                    border-color: var(--lajama-gold, #D4A373) !important;
                }
                .btn-pag-jama-active,
                .page-link-jama-block.btn-pag-jama-active,
                .page-item-jama.active .page-link-jama {
                    background-color: var(--lajama-green, #1B3A2C) !important;
                    color: var(--lajama-cream, #FBF9F4) !important;
                    border-color: var(--lajama-green, #1B3A2C) !important;
                    box-shadow: var(--shadow-sm, 0 2px 8px rgba(27,58,44,0.04)) !important;
                }

                /* 🌟 PARCHE DE ARREGLO PARA EL INPUT DE TEXTO DE BLOQUES */
                .input-bloque-jama {
                    width: 55px !important; /* Más holgura física para escribir */
                    background: transparent !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 4px !important;
                    font-size: 0.9rem !important;
                    height: 24px !important;
                }
                .input-bloque-jama:focus {
                    outline: none !important;
                    box-shadow: none !important;
                }
            </style>

            <div class="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2 p-2 bg-light rounded-bottom-4">
                <div class="d-flex align-items-center gap-1 bg-white p-1 rounded border shadow-sm" style="max-width:220px; border-color:var(--lajama-peach) !important;">
                    <span class="text-muted small ps-1 fw-bold" style="font-size:0.68rem; color:var(--lajama-green) !important; white-space: nowrap;">IR AL BLOQUE:</span>

                    <input type="number" id="inputDestinoBloque" min="1" max="${bloquesKardexPaginados.length}"
                           class="form-control form-control-sm text-center fw-bold text-dark input-bloque-jama"
                           placeholder="${bloqueVisibleActual}">

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

// ========================================================
// 🛡️ CONTROL DEFENSIVO DE FECHAS PARA EL KARDEX (LA JAMA)
// ========================================================
const inputFechaInicio = document.getElementById('searchKardexFechaInicio');
const inputFechaFin = document.getElementById('searchKardexFechaFin');

if (inputFechaInicio && inputFechaFin) {
    // 1. Obtenemos la fecha de hoy en formato ISO (YYYY-MM-DD)
    const hoy = new Date().toISOString().split('T')[0];

    // 2. Establecemos los límites físicos en los calendarios del navegador
    // Nadie puede buscar antes del inicio de este año (o pon 2024-01-01 si manejas histórico largo)
    inputFechaInicio.min = "2026-01-01";
    inputFechaInicio.max = hoy; // No puede ser mayor a hoy

    inputFechaFin.min = "2026-01-01";
    inputFechaFin.max = hoy; // 🔥 LA RESPUESTA: Bloqueamos la fecha límite para que no sea futura

    // 3. Escuchas de cambio limpios
    inputFechaInicio.addEventListener('change', function() {
        // Validación dinámica: La fecha fin no puede ser menor a la fecha inicio seleccionada
        inputFechaFin.min = this.value;
        ejecutarFiltroCombinadoKardex();
    });

    inputFechaFin.addEventListener('change', function() {
        // Validación dinámica: La fecha inicio no puede ser mayor a la fecha fin seleccionada
        inputFechaInicio.max = this.value;
        ejecutarFiltroCombinadoKardex();
    });
}