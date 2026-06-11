/**
 * LA JAMA — insumos-produccion.js
 * Procesamiento de porciones en cocina y cálculo de merma.
 * Depende de: insumos-core.js
 */

async function abrirModalProduccion(idInsumo, nombre) {
    document.getElementById('prodIdInsumo').value      = idInsumo;
    document.getElementById('prodNombreInsumo').innerText = nombre;

    document.getElementById('prodKg').value          = '';
    document.getElementById('prodObtenidas').value   = '';
    document.getElementById('prodMerma').value        = '';
    document.getElementById('prodObservacion').value  = '';

    const selectLote = document.getElementById('prodSelectLote');
    selectLote.innerHTML = '<option value="">Cargando lotes...</option>';

    if (modalProduccionInstance) modalProduccionInstance.show();

    try {
        const res   = await fetch(`/proteinas/lotes/${idInsumo}`);
        const lotes = await res.json();

        const lotesVigentes = lotes.filter(l =>
            (l.saldoKg !== undefined && l.saldoKg !== null ? l.saldoKg : l.kgComprados) > 0
        );

        if (lotesVigentes.length === 0) {
            selectLote.innerHTML = '<option value="">Sin lotes con saldo disponible</option>';
            document.getElementById('prodKg').disabled = true;
            return;
        }

        document.getElementById('prodKg').disabled = false;

        selectLote.innerHTML = lotesVigentes.map(l => {
            const saldo    = l.saldoKg !== undefined && l.saldoKg !== null ? l.saldoKg : l.kgComprados;
            const porciones = l.porcionesPorKg !== undefined && l.porcionesPorKg !== null ? l.porcionesPorKg : 0;
            return `
                <option value="${l.id}" data-kg="${saldo}" data-porciones="${porciones}">
                    ${new Date(l.fechaCompra).toLocaleDateString('es-PE')} — Quedan: ${saldo.toFixed(2)} kg (de ${l.kgComprados} kg) — ${porciones} porc/kg
                </option>`;
        }).join('');

        if (lotesVigentes.length > 0) {
            selectLote.value = lotesVigentes[0].id;
            actualizarPorcionesEsperadas();
        }

    } catch (e) {
        console.error(e);
        selectLote.innerHTML = '<option value="">Error al cargar lotes</option>';
    }
}

function actualizarPorcionesEsperadas() {
    const selectLote     = document.getElementById('prodSelectLote');
    const selectedOption = selectLote.options[selectLote.selectedIndex];
    const inputKg        = document.getElementById('prodKg');

    if (selectedOption && selectedOption.dataset.kg) {
        const maxSaldo = parseFloat(selectedOption.dataset.kg);
        inputKg.max         = maxSaldo;
        inputKg.placeholder = `Máx: ${maxSaldo.toFixed(2)} kg`;

        if (parseFloat(inputKg.value) > maxSaldo) {
            inputKg.value = maxSaldo;
            AppUtils.showNotification(`Se ajustó la cantidad al máximo disponible (${maxSaldo.toFixed(2)} kg)`, 'warning');
            calcularMerma();
        }
    }
}

function calcularMerma() {
    const kgProcesados       = parseFloat(document.getElementById('prodKg').value) || 0;
    const porcionesObtenidas = parseInt(document.getElementById('prodObtenidas').value) || 0;
    const mermaBalanzaKg     = parseFloat(document.getElementById('prodMerma').value) || 0;

    const selectLote         = document.getElementById('prodSelectLote');
    const selectedOption     = selectLote.options[selectLote.selectedIndex];
    const porcionesEsperadasPorKg = selectedOption ? parseFloat(selectedOption.dataset.porciones) || 0 : 0;

    const resumen = document.getElementById('resumenMerma');

    if (kgProcesados <= 0 || porcionesObtenidas <= 0 || porcionesEsperadasPorKg <= 0) {
        resumen.classList.add('d-none');
        return;
    }

    // 📊 Balance de unidades reales
    const porcionesEsperadas = Math.round(kgProcesados * porcionesEsperadasPorKg);
    const diferenciaPorciones = porcionesObtenidas - porcionesEsperadas;
    const porcentajeEficiencia = ((porcionesObtenidas / porcionesEsperadas) * 100).toFixed(1);

    // Semáforo visual sutil para el borde izquierdo
    let colorIndicador = '#0dcaf0'; // Celeste para perfecto
    let mensajeRendimiento = `✅ Corte alineado al estándar del lote.`;

    if (diferenciaPorciones < 0) {
        colorIndicador = '#dc3545'; // Rojo si salieron menos porciones
        mensajeRendimiento = `⚠️ Desviación de gramaje: Se obtuvieron ${Math.abs(diferenciaPorciones)} porciones menos (cortes más grandes de lo previsto).`;
    } else if (diferenciaPorciones > 0) {
        colorIndicador = '#198754'; // Verde si rindió más
        mensajeRendimiento = `🎉 Alto rendimiento: Se obtuvieron ${diferenciaPorciones} porciones extra (cortes más delgados).`;
    }

    resumen.innerHTML = `
        <div class="p-3 rounded-3 text-dark small shadow-sm"
             style="background-color: var(--lajama-cream); border-left: 4px solid ${colorIndicador}; border-top: 1px solid rgba(27,58,44,0.08); border-right: 1px solid rgba(27,58,44,0.08); border-bottom: 1px solid rgba(27,58,44,0.08); font-family: system-ui, sans-serif;">

            <div class="fw-bold mb-2 text-uppercase tracking-wider" style="color: var(--lajama-green); font-size: 0.72rem; letter-spacing: 0.05em;">
                📊 Balance de Rendimiento en Cocina
            </div>

            <div class="d-flex justify-content-between mb-1" style="border-bottom: 1px dashed rgba(27,58,44,0.05); padding-bottom: 2px;">
                <span class="text-muted">Porciones Esperadas:</span>
                <span class="fw-bold text-dark">${porcionesEsperadas} porc.</span>
            </div>

            <div class="d-flex justify-content-between mb-1" style="border-bottom: 1px dashed rgba(27,58,44,0.05); padding-bottom: 2px;">
                <span class="text-muted">Porciones Reales Obtenidas:</span>
                <span class="fw-bold text-dark">${porcionesObtenidas} porc.</span>
            </div>

            <div class="d-flex justify-content-between mb-1" style="border-bottom: 1px dashed rgba(27,58,44,0.05); padding-bottom: 2px;">
                <span class="text-muted">Eficiencia del Corte:</span>
                <span class="fw-bold text-dark">${porcentajeEficiencia}%</span>
            </div>

            <div class="d-flex justify-content-between mb-2">
                <span class="text-muted">Merma Física (Balanza):</span>
                <span class="fw-bold text-info">${mermaBalanzaKg.toFixed(3)} kg</span>
            </div>

            <div class="mt-2 p-2 rounded bg-white text-center fw-semibold text-secondary" style="font-size: 0.72rem; border: 1px solid rgba(27,58,44,0.06);">
                ${mensajeRendimiento}
            </div>
        </div>`;

    resumen.classList.remove('d-none');
}

async function guardarProduccion(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const idInsumo           = document.getElementById('prodIdInsumo').value;
    const idLote             = document.getElementById('prodSelectLote').value;
    const kgProcesados       = document.getElementById('prodKg').value;
    const porcionesObtenidas = document.getElementById('prodObtenidas').value;
    const mermaKg            = document.getElementById('prodMerma').value;
    const observacion        = document.getElementById('prodObservacion').value;

    // 1. Validaciones de existencia y formatos base
    if (!idLote) { AppUtils.showNotification('Debe seleccionar un lote disponible', 'error'); return; }
    if (!kgProcesados || parseFloat(kgProcesados) <= 0) { AppUtils.showNotification('Ingrese una cantidad válida a procesar', 'error'); return; }
    if (!porcionesObtenidas || parseInt(porcionesObtenidas) <= 0) { AppUtils.showNotification('Ingrese las porciones reales obtenidas', 'error'); return; }
    if (!mermaKg || parseFloat(mermaKg) < 0) { AppUtils.showNotification('Ingrese la merma obtenida en la balanza (puede ser 0)', 'error'); return; }

    // 🌟 AQUÍ VA EL NUEVO CANDADO DE COHERENCIA FÍSICA
    if (parseInt(porcionesObtenidas) > 0 && parseFloat(mermaKg) >= parseFloat(kgProcesados)) {
        AppUtils.showNotification("Si se obtuvieron porciones, la merma no puede igualar o superar los kg procesados.", "error");
        return;
    }

    // 2. Control de stock máximo permitido del lote
    const maxPermitido = parseFloat(document.getElementById('prodKg').max);
    if (parseFloat(kgProcesados) > maxPermitido) {
        AppUtils.showNotification(`No puedes procesar más del saldo disponible del lote (${maxPermitido.toFixed(2)} kg)`, 'error');
        return;
    }

    AppUtils.showLoading(true);
    try {
        const res = await fetch('/proteinas/produccion/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idLote:            parseInt(idLote),
                kgProcesados:      parseFloat(kgProcesados),
                porcionesObtenidas: parseInt(porcionesObtenidas),
                mermaKg:           parseFloat(mermaKg),
                observacion:       observacion || null
            })
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            // Descuento en caliente del lote seleccionado en el combo
            const selectLote = document.getElementById('prodSelectLote');
            const opcionSeleccionada = selectLote.options[selectLote.selectedIndex];
            if (opcionSeleccionada) {
                const kgAnteriores = parseFloat(opcionSeleccionada.dataset.kg) || 0;
                const kgRestados = parseFloat(kgProcesados);
                const nuevoSaldoLote = Math.max(0, kgAnteriores - kgRestados);

                opcionSeleccionada.dataset.kg = nuevoSaldoLote;

                const fechaTexto = opcionSeleccionada.textContent.split('—')[0].trim();
                const porcionesTexto = opcionSeleccionada.textContent.split('—')[2].trim();
                opcionSeleccionada.textContent = `${fechaTexto} — Quedan: ${nuevoSaldoLote.toFixed(2)} kg — ${porcionesTexto}`;

                if (nuevoSaldoLote <= 0) {
                    opcionSeleccionada.remove();
                }
            }

            // Ocultar modal usando la instancia de control
            if (modalProduccionInstance) {
                modalProduccionInstance.hide();
            } else {
                bootstrap.Modal.getInstance(document.getElementById('modalProduccion'))?.hide();
            }

            AppUtils.showNotification('Producción registrada correctamente', 'success');

            // Mutación asíncrona de la fila
            const botonFila = document.querySelector(`button[data-id="${idInsumo}"]`);
            const fila = botonFila ? botonFila.closest('tr') : null;

            let celdaTarget = null;
            let nuevoStockCalculado = 0;

            if (fila) {
                const celdaStock = fila.querySelector('.badge-stock-dinamico');
                if (celdaStock) {
                    const stockActual = parseFloat(celdaStock.textContent) || 0;
                    const porcionesNuevas = parseInt(porcionesObtenidas);

                    nuevoStockCalculado = stockActual + porcionesNuevas;
                    celdaStock.textContent = Math.round(nuevoStockCalculado);
                    celdaTarget = celdaStock;
                }
            }

            if (celdaTarget) {
                actualizarSemaforoVisualStock(celdaTarget, nuevoStockCalculado, true);
            }

            document.getElementById('resumenMerma')?.classList.add('d-none');
            sincronizarFiltrosYPaginas();

        } else {
            const errorText = await res.text();
            AppUtils.showNotification('Error: ' + (errorText || 'No se pudo registrar'), 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        console.error(e);
        AppUtils.showNotification('Error de conexión con el servidor', 'error');
    }
}