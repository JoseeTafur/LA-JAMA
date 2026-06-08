/**
 * LA JAMA — insumos-lote.js
 * Registro de ingreso de mercadería / lotes de compra.
 * Depende de: insumos-core.js
 */

function abrirModalLote(idInsumo, nombre, categoria) {
    document.getElementById('loteIdInsumo').value      = idInsumo;
    document.getElementById('loteCategoriaInsumo').value = categoria;
    document.getElementById('loteNombreInsumo').innerText = nombre;

    document.getElementById('loteKg').value          = '';
    document.getElementById('lotePorcionesPorKg').value = '';
    document.getElementById('loteCosto').value        = '';
    document.getElementById('loteObservacion').value  = '';

    const contenedorPorciones = document.getElementById('contenedorPorcionesLote');
    const lblCantidad         = document.getElementById('lblCantidadComprada');

    if (categoria === 'PROTEINA') {
        contenedorPorciones?.classList.remove('d-none');
        if (lblCantidad) lblCantidad.innerText = "Kg Comprados *";
        document.getElementById('loteKg').placeholder = "Ej: 10";
    } else {
        contenedorPorciones?.classList.add('d-none');
        if (lblCantidad) lblCantidad.innerText = "Cantidad Comprada (Kg/Gr/Sacos) *";
        document.getElementById('loteKg').placeholder = "Ej: 2 (Sacos o Kilos)";
    }

    if (modalLoteInstance) {
        modalLoteInstance.show();
    } else {
        new bootstrap.Modal(document.getElementById('modalLote')).show();
    }
}

async function guardarLote() {
    const idInsumo    = document.getElementById('loteIdInsumo').value;
    const categoria   = document.getElementById('loteCategoriaInsumo').value;
    const kgComprados = document.getElementById('loteKg').value;
    const costoTotal  = document.getElementById('loteCosto').value;
    const observacion = document.getElementById('loteObservacion').value;

    let porcionesPorKg = document.getElementById('lotePorcionesPorKg').value;
    if (categoria !== 'PROTEINA') porcionesPorKg = "1.0";

    if (!kgComprados || parseFloat(kgComprados) <= 0) {
        AppUtils.showNotification('Ingresa una cantidad válida comprada', 'error');
        return;
    }
    if (categoria === 'PROTEINA' && (!porcionesPorKg || parseFloat(porcionesPorKg) <= 0)) {
        AppUtils.showNotification('Ingresa las porciones esperadas por kg', 'error');
        return;
    }
    if (!costoTotal || parseFloat(costoTotal) <= 0) {
        AppUtils.showNotification('El costo total es obligatorio', 'error');
        return;
    }

    AppUtils.showLoading(true);
    try {
        const res = await fetch('/proteinas/lotes/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idInsumo:      parseInt(idInsumo),
                kgComprados:   parseFloat(kgComprados),
                porcionesPorKg: parseFloat(porcionesPorKg),
                costoTotal:    parseFloat(costoTotal),
                observacion:   observacion || null
            })
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            modalLoteInstance?.hide();
            AppUtils.showNotification('Ingreso registrado con éxito', 'success');
            await new Promise(resolve => setTimeout(resolve, 600));
            location.reload();
        } else {
            AppUtils.showNotification('Error al procesar el registro', 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión con el servidor', 'error');
    }
}