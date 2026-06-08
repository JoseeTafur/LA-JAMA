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

    const selectLote         = document.getElementById('prodSelectLote');
    const selectedOption     = selectLote.options[selectLote.selectedIndex];
    const porcionesEsperadasPorKg = selectedOption ? parseFloat(selectedOption.dataset.porciones) || 0 : 0;

    const resumen = document.getElementById('resumenMerma');

    if (kgProcesados <= 0 || porcionesObtenidas <= 0 || porcionesEsperadasPorKg <= 0) {
        resumen.classList.add('d-none');
        return;
    }

    const porcionesEsperadas = Math.round(kgProcesados * porcionesEsperadasPorKg);
    const diferencia         = porcionesObtenidas - porcionesEsperadas;
    const mermaKg            = Math.abs(diferencia) / porcionesEsperadasPorKg;

    resumen.innerHTML = `
        <div class="d-flex justify-content-between">
            <span>Porciones esperadas:</span>
            <strong>${porcionesEsperadas}</strong>
        </div>
        <div class="d-flex justify-content-between">
            <span>Diferencia:</span>
            <strong class="${diferencia >= 0 ? 'text-success' : 'text-danger'}">
                ${diferencia >= 0 ? '+' : ''}${diferencia} porciones
            </strong>
        </div>
        <div class="d-flex justify-content-between">
            <span>Merma estimada:</span>
            <strong>${mermaKg.toFixed(3)} kg</strong>
        </div>`;

    resumen.classList.remove('d-none');
    resumen.className = `alert rounded-3 small p-3 ${diferencia < 0 ? 'alert-danger' : 'alert-warning'}`;
}

async function guardarProduccion() {
    const idInsumo           = document.getElementById('prodIdInsumo').value;
    const idLote             = document.getElementById('prodSelectLote').value;
    const kgProcesados       = document.getElementById('prodKg').value;
    const porcionesObtenidas = document.getElementById('prodObtenidas').value;
    const mermaKg            = document.getElementById('prodMerma').value;
    const observacion        = document.getElementById('prodObservacion').value;

    if (!idLote) { AppUtils.showNotification('Debe seleccionar un lote disponible', 'error'); return; }
    if (!kgProcesados || parseFloat(kgProcesados) <= 0) { AppUtils.showNotification('Ingrese una cantidad válida a procesar', 'error'); return; }
    if (!porcionesObtenidas || parseInt(porcionesObtenidas) <= 0) { AppUtils.showNotification('Ingrese las porciones reales obtenidas', 'error'); return; }
    if (!mermaKg || parseFloat(mermaKg) < 0) { AppUtils.showNotification('Ingrese la merma obtenida en la balanza (puede ser 0)', 'error'); return; }

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
            modalProduccionInstance?.hide();
            AppUtils.showNotification('Producción registrada correctamente', 'success');
            setTimeout(() => location.reload(), 900);
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