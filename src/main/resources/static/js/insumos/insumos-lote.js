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
    if (categoria !== 'PROTEINA') porcionesPorKg = "0.0";

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

    const urlDestino = (categoria === 'PROTEINA') ? '/proteinas/lotes/registrar' : '/insumos/lote/registrar';

    AppUtils.showLoading(true);
    try {
        const res = await fetch(urlDestino, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idInsumo:      parseInt(idInsumo),
                kgComprados:   parseFloat(kgComprados),
                porcionesPorKg: parseFloat(porcionesPorKg),
                costoTotal:    parseFloat(costoTotal),
                observacion:   observacion || ""
            })
        });

        AppUtils.showLoading(false);

    if (res.ok) {
            modalLoteInstance?.hide();
            AppUtils.showNotification('Ingreso de lote registrado con éxito', 'success');

            const botonFila = document.querySelector(`button[data-id="${idInsumo}"]`);
            const fila = botonFila ? botonFila.closest('tr') : null;

            let celdaTarget = null;
            let nuevoStock = 0;

            if (fila) {
                // 1. Localizamos la celda de stock/porciones (Segunda columna)
                const celdaStock = fila.querySelector('.badge-stock-dinamico');

                if (celdaStock) {
                    const stockActual = parseFloat(celdaStock.textContent) || 0;
                    const cantidadNueva = parseFloat(kgComprados);

                    if (categoria === 'PROTEINA') {
                        // 🌟 REGLA CORREGIDA: El lote de proteína NO suma porciones en caliente, se mantiene el stock actual
                        nuevoStock = stockActual;

                        // 🌟 REGLA ADICIONAL: Actualizamos visualmente el rendimiento maestro en la tercera columna (td:nth-child(3))
                        const celdaRendimiento = fila.querySelector('td:nth-child(3) .fw-semibold');
                        if (celdaRendimiento) {
                            celdaRendimiento.textContent = parseFloat(porcionesPorKg).toFixed(1);
                        }
                    } else {
                        // Los insumos generales reemplazan el número por el nuevo contenedor (Regla de reinicio)
                        nuevoStock = cantidadNueva;
                    }

                    celdaStock.textContent = (categoria === 'PROTEINA') ? Math.round(nuevoStock) : nuevoStock;
                    celdaTarget = celdaStock;
                }
            }

            // Evaluamos el semáforo visual con el valor real persistido
            if (celdaTarget) {
                const esProteina = (categoria === 'PROTEINA');
                actualizarSemaforoVisualStock(celdaTarget, nuevoStock, esProteina);
            }

            sincronizarFiltrosYPaginas();

        } else {
            const txtErr = await res.text();
            console.error("Error devuelto por el servidor:", txtErr);
            AppUtils.showNotification('Error al procesar el registro en el servidor', 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        console.error("Excepción atrapada en el flujo asíncrono:", e);
        AppUtils.showNotification('Error de conexión con el servidor', 'error');
    }
}