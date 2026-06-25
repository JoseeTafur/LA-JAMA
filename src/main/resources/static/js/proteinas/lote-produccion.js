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

