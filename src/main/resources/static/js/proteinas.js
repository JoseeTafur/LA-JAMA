// ─── Instancias de modales ────────────────────────────────────
let kardexData = [];
let modalLoteInstance        = null;
let modalProduccionInstance  = null;
let modalAjusteInstance      = null;
let modalKardexPorcionesInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    modalLoteInstance            = new bootstrap.Modal(document.getElementById('modalLote'));
    modalProduccionInstance      = new bootstrap.Modal(document.getElementById('modalProduccion'));
    modalAjusteInstance          = new bootstrap.Modal(document.getElementById('modalAjuste'));
    modalKardexPorcionesInstance = new bootstrap.Modal(document.getElementById('modalKardexPorciones'));
});

// ─── LOTE ─────────────────────────────────────────────────────

function abrirModalLote(idInsumo, nombre) {
    document.getElementById('loteIdInsumo').value = idInsumo;
    document.getElementById('loteNombreInsumo').innerText = nombre;
    document.getElementById('loteKg').value = '';
    document.getElementById('loteCosto').value = '';
    document.getElementById('loteObservacion').value = '';
    modalLoteInstance.show();
}

async function guardarLote() {
    const idInsumo    = document.getElementById('loteIdInsumo').value;
    const kgComprados = document.getElementById('loteKg').value;
    const costoTotal  = document.getElementById('loteCosto').value;
    const observacion = document.getElementById('loteObservacion').value;

    if (!kgComprados || parseFloat(kgComprados) <= 0) {
        AppUtils.showNotification('Ingresa los kg comprados', 'error');
        return;
    }

    AppUtils.showLoading(true);
    try {
        const res = await fetch('/proteinas/lotes/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idInsumo: parseInt(idInsumo),
                kgComprados: parseFloat(kgComprados),
                costoTotal: costoTotal ? parseFloat(costoTotal) : null,
                observacion: observacion || null
            })
        });
        AppUtils.showLoading(false);
        if (res.ok) {
            modalLoteInstance.hide();
            AppUtils.showNotification('Lote registrado correctamente', 'success');
        } else {
            AppUtils.showNotification('Error al registrar el lote', 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión', 'error');
    }
}

// ─── PRODUCCIÓN ───────────────────────────────────────────────

async function abrirModalProduccion(idInsumo, nombre) {
    document.getElementById('prodIdInsumo').value = idInsumo;
    document.getElementById('prodNombreInsumo').innerText = nombre;
    document.getElementById('prodKg').value = '';
    document.getElementById('prodEsperadas').value = '';
    document.getElementById('prodObtenidas').value = '';
    document.getElementById('prodObservacion').value = '';
    document.getElementById('resumenMerma').classList.add('d-none');

    // Cargar lotes disponibles del insumo
    const selectLote = document.getElementById('prodSelectLote');
    selectLote.innerHTML = '<option value="">Cargando...</option>';
    modalProduccionInstance.show();

    try {
        const res = await fetch(`/proteinas/lotes/${idInsumo}`);
        const lotes = await res.json();

        if (lotes.length === 0) {
            selectLote.innerHTML = '<option value="">Sin lotes registrados</option>';
            return;
        }

        selectLote.innerHTML = lotes.map(l => `
            <option value="${l.id}" data-kg="${l.kgComprados}">
                ${new Date(l.fechaCompra).toLocaleDateString()} — ${l.kgComprados} kg
                ${l.observacion ? '(' + l.observacion + ')' : ''}
            </option>
        `).join('');

    } catch (e) {
        selectLote.innerHTML = '<option value="">Error al cargar lotes</option>';
    }
}

function calcularMerma() {
    const kg         = parseFloat(document.getElementById('prodKg').value);
    const esperadas  = parseInt(document.getElementById('prodEsperadas').value);
    const obtenidas  = parseInt(document.getElementById('prodObtenidas').value);
    const resumen    = document.getElementById('resumenMerma');

    if (!kg || !esperadas || !obtenidas || esperadas <= 0) {
        resumen.classList.add('d-none');
        return;
    }

    const diferencia = obtenidas - esperadas;
    const pesoPorPorcion = kg / esperadas;
    const mermaKg = Math.abs(diferencia) * pesoPorPorcion;

    document.getElementById('mermaPorciones').innerText =
        (diferencia >= 0 ? '+' : '') + diferencia + ' porciones';
    document.getElementById('mermaKg').innerText =
        mermaKg.toFixed(3) + ' kg';

    resumen.classList.remove('d-none');
    resumen.className = `alert rounded-3 small ${diferencia < 0 ? 'alert-warning' : 'alert-success'}`;
}

async function guardarProduccion() {
    // 1. Recopilación de datos del formulario del modal de cocina
    const idInsumo       = document.getElementById('prodIdInsumo').value;
    const idLote         = document.getElementById('prodSelectLote').value;
    const kgProcesados   = document.getElementById('prodKg').value;
    const porcionesObtenidas = document.getElementById('prodObtenidas').value;
    const mermaKg        = document.getElementById('prodMerma').value;
    const observacion    = document.getElementById('prodObservacion').value;

    // Validaciones rápidas de seguridad
    if (!idLote) { AppUtils.showNotification('Selecciona un lote válido', 'error'); return; }
    if (!kgProcesados || parseFloat(kgProcesados) <= 0) { AppUtils.showNotification('Ingresa los kg a procesar', 'error'); return; }
    if (!porcionesObtenidas || parseInt(porcionesObtenidas) <= 0) { AppUtils.showNotification('Ingresa las porciones reales obtenidas', 'error'); return; }

    AppUtils.showLoading(true);
    try {
        // Enviamos los datos al endpoint de producción que ya tienes en tu ProteinaController
        const res = await fetch('/proteinas/produccion/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idLote: parseInt(idLote),
                kgProcesados: parseFloat(kgProcesados),
                porcionesObtenidas: parseInt(porcionesObtenidas),
                mermaKg: parseFloat(mermaKg) || 0.0,
                observacion: observacion || ""
            })
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            // 🌟 ÉXITO: Cerramos el modal de cocina sin pestañear
            if (window.modalProduccionInstance) {
                modalProduccionInstance.hide();
            } else {
                bootstrap.Modal.getInstance(document.getElementById('modalProduccion'))?.hide();
            }

            AppUtils.showNotification('Producción procesada e ingresada a cocina', 'success');

            // 🌟 MUTACIÓN DEL DOM EN CALIENTE (Adiós al F5)
            const botonFila = document.querySelector(`button[data-id="${idInsumo}"]`);
            const fila = botonFila ? botonFila.closest('tr') : null;

            let celdaTarget = null;
            let nuevoStockCalculado = 0;

            if (fila) {
                // Buscamos el badge del stock dinámico que creamos en el paso anterior
                const celdaStock = fila.querySelector('.badge-stock-dinamico');
                if (celdaStock) {
                    const stockActual = parseFloat(celdaStock.textContent) || 0;
                    const porcionesNuevas = parseInt(porcionesObtenidas);

                    // 🥩 En producción SÍ se acumulan las porciones reales obtenidas
                    nuevoStockCalculado = stockActual + porcionesNuevas;
                    celdaStock.textContent = Math.round(nuevoStockCalculado);

                    celdaTarget = celdaStock; // Guardamos referencia para el semáforo
                }
            }

            // 🚦 Evaluamos el semáforo en tiempo real con las porciones reales acumuladas
            if (celdaTarget) {
                actualizarSemaforoVisualStock(celdaTarget, nuevoStockCalculado, true);
            }

            // Sincronizamos las páginas y filtros de la tabla principal
            sincronizarFiltrosYPaginas();

        } else {
            const txtErr = await res.text();
            AppUtils.showNotification('Error en cocina: ' + (txtErr || 'No se pudo registrar'), 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        console.error("Excepción en producción asíncrona:", e);
        AppUtils.showNotification('Error de red al conectar con la cocina', 'error');
    }
}

// ─── AJUSTE ───────────────────────────────────────────────────

function abrirModalAjuste(idInsumo, nombre) {
    document.getElementById('ajusteIdInsumo').value = idInsumo;
    document.getElementById('ajusteNombreInsumo').innerText = nombre;
    document.getElementById('ajusteTipo').value = '';
    document.getElementById('ajusteCantidad').value = '';
    document.getElementById('ajusteMotivo').value = '';
    document.getElementById('btnIngreso').classList.remove('btn-success');
    document.getElementById('btnIngreso').classList.add('btn-outline-success');
    document.getElementById('btnEgreso').classList.remove('btn-danger');
    document.getElementById('btnEgreso').classList.add('btn-outline-danger');
    modalAjusteInstance.show();
}

function seleccionarTipoAjuste(tipo) {
    document.getElementById('ajusteTipo').value = tipo;
    if (tipo === 'INGRESO') {
        document.getElementById('btnIngreso').classList.replace('btn-outline-success', 'btn-success');
        document.getElementById('btnEgreso').classList.replace('btn-danger', 'btn-outline-danger');
    } else {
        document.getElementById('btnEgreso').classList.replace('btn-outline-danger', 'btn-danger');
        document.getElementById('btnIngreso').classList.replace('btn-success', 'btn-outline-success');
    }
}

async function guardarAjuste() {
    const idInsumo = document.getElementById('ajusteIdInsumo').value;
    const tipo     = document.getElementById('ajusteTipo').value;
    const cantidad = document.getElementById('ajusteCantidad').value;
    const motivo   = document.getElementById('ajusteMotivo').value;

    if (!tipo) {
        AppUtils.showNotification('Selecciona Ingreso o Egreso', 'error');
        return;
    }
    if (!cantidad || parseInt(cantidad) <= 0) {
        AppUtils.showNotification('Ingresa una cantidad válida', 'error');
        return;
    }
    if (!motivo.trim()) {
        AppUtils.showNotification('Ingresa el motivo del ajuste', 'error');
        return;
    }

    AppUtils.showLoading(true);
    try {
        const params = new URLSearchParams({ idInsumo, cantidad, tipo, motivo });
        const res = await fetch('/proteinas/movimientos/ajustar?' + params.toString(), {
            method: 'POST'
        });
        AppUtils.showLoading(false);
        if (res.ok) {
            modalAjusteInstance.hide();
            AppUtils.showNotification('Ajuste registrado correctamente', 'success');
            setTimeout(() => location.reload(), 1200);
        } else {
            const err = await res.text();
            AppUtils.showNotification('Error: ' + err, 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión', 'error');
    }
}

// ─── KARDEX PORCIONES ─────────────────────────────────────────

async function abrirKardexPorciones(id, nombre) {
    document.getElementById('tituloKardexPorciones').innerHTML =
        `<i class="bi bi-clock-history me-2"></i>Kardex: ${nombre}`;

    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    cuerpo.innerHTML = '<tr><td colspan="5" class="text-center py-3">Cargando...</td></tr>';

    // Reset filtro a "TODOS"
    document.querySelectorAll('.filtro-kardex').forEach(b => b.classList.remove('active'));
    document.querySelector('.filtro-kardex[data-filtro="TODOS"]').classList.add('active');

    modalKardexPorcionesInstance.show();

    try {
        const res = await fetch(`/proteinas/kardex/${id}`);
        kardexData = await res.json();
        renderKardex(kardexData);
    } catch (e) {
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar.</td></tr>';
    }
}

function filtrarKardex(filtro) {
    // Actualizar botón activo
    document.querySelectorAll('.filtro-kardex').forEach(b => {
        b.classList.remove('active');
        // alternar clases outline
        const origen = b.dataset.filtro;
        const claseActiva = claseBoton(origen);
        b.className = b.className.replace(claseActiva, 'btn-outline-' + claseColor(origen));
    });
    const btnActivo = document.querySelector(`.filtro-kardex[data-filtro="${filtro}"]`);
    if (btnActivo) {
        btnActivo.classList.add('active');
        const color = claseColor(filtro);
        btnActivo.className = btnActivo.className.replace('btn-outline-' + color, 'btn-' + color);
    }

    const datos = filtro === 'TODOS' ? kardexData : kardexData.filter(m => m.origen === filtro);
    renderKardex(datos);
}


function renderKardex(datos) {
    const cuerpo = document.getElementById('cuerpoKardexPorciones');

    if (datos.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Sin registros.</td></tr>';
        return;
    }

    cuerpo.innerHTML = datos.map(m => {
        const badge = badgeOrigen(m.origen);
        const stockCell = m.stockResultante != null
            ? m.stockResultante + ' porc.'
            : '<span class="text-muted">—</span>';
        const cantCell = `<span class="fw-bold ${m.signo === '+' ? 'text-success' : m.signo === '-' ? 'text-danger' : ''}">`
            + m.signo + ' ' + m.cantidad + '</span>';

        return `
            <tr data-origen="${m.origen}">
                <td class="ps-3 text-muted">${new Date(m.fecha).toLocaleString('es-PE')}</td>
                <td>${badge}</td>
                <td>${m.detalle}</td>
                <td class="text-end">${cantCell}</td>
                <td class="text-end pe-3 text-muted">${stockCell}</td>
            </tr>
        `;
    }).join('');
}

function badgeOrigen(origen) {
    const map = {
        'LOTE':       '<span class="badge-kardex badge-lote">🛒 Lote</span>',
        'PRODUCCION': '<span class="badge-kardex badge-prod">🔥 Producción</span>',
        'AJUSTE':     '<span class="badge-kardex badge-ajuste">⚙️ Ajuste</span>',
        'VENTA':      '<span class="badge-kardex badge-venta">📦 Venta</span>'
    };
    return map[origen] ?? `<span class="badge-kardex badge-ajuste">${origen}</span>`;
}

function claseColor(origen) {
    const map = {
        'TODOS': 'primary', 'LOTE': 'success',
        'PRODUCCION': 'warning', 'AJUSTE': 'secondary', 'VENTA': 'danger'
    };
    return map[origen] ?? 'secondary';
}

function claseBoton(origen) {
    return 'btn-' + claseColor(origen);
}