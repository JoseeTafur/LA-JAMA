/**
 * LA JAMA — insumos-ajuste.js
 * Ajustes manuales de ingreso/egreso de porciones.
 * Depende de: insumos-core.js
 */

function abrirModalAjuste(idInsumo, nombre) {
    document.getElementById('ajusteIdInsumo').value      = idInsumo;
    document.getElementById('ajusteNombreInsumo').innerText = nombre;
    document.getElementById('ajusteTipo').value          = '';
    document.getElementById('ajusteCantidad').value      = '';
    document.getElementById('ajusteMotivo').value        = '';

    document.getElementById('btnIngreso').className = 'btn btn-outline-success flex-fill rounded-3 fw-bold';
    document.getElementById('btnEgreso').className  = 'btn btn-outline-danger flex-fill rounded-3 fw-bold';

    if (modalAjusteInstance) modalAjusteInstance.show();
}

function seleccionarTipoAjuste(tipo) {
    document.getElementById('ajusteTipo').value = tipo;
    const btnIngreso = document.getElementById('btnIngreso');
    const btnEgreso  = document.getElementById('btnEgreso');

    if (tipo === 'INGRESO') {
        btnIngreso.className = 'btn btn-success flex-fill rounded-3 fw-bold';
        btnEgreso.className  = 'btn btn-outline-danger flex-fill rounded-3 fw-bold';
    } else {
        btnEgreso.className  = 'btn btn-danger flex-fill rounded-3 fw-bold';
        btnIngreso.className = 'btn btn-outline-success flex-fill rounded-3 fw-bold';
    }
}

async function guardarAjuste() {
    const idInsumo = document.getElementById('ajusteIdInsumo').value;
    const tipo     = document.getElementById('ajusteTipo').value;
    const cantidad = document.getElementById('ajusteCantidad').value;
    const motivo   = document.getElementById('ajusteMotivo').value;

    if (!tipo)                              { AppUtils.showNotification('Selecciona Ingreso o Egreso', 'error'); return; }
    if (!cantidad || parseInt(cantidad) <= 0) { AppUtils.showNotification('Ingresa una cantidad válida', 'error'); return; }
    if (!motivo.trim())                     { AppUtils.showNotification('Ingresa el motivo del ajuste', 'error'); return; }

    AppUtils.showLoading(true);
    try {
        const params = new URLSearchParams({ idInsumo, cantidad, tipo, motivo });
        const res = await fetch('/proteinas/movimientos/ajustar?' + params.toString(), { method: 'POST' });

        AppUtils.showLoading(false);

        if (res.ok) {
            modalAjusteInstance?.hide();
            AppUtils.showNotification('Ajuste de porciones registrado', 'success');

            // 🌟 ACTUALIZACIÓN ASÍNCRONA COMPLETA (SIN RECARGAR)
            // Buscamos cualquier botón de la fila que tenga el data-id para amarrar el nodo <tr>
            const botonFila = document.querySelector(`#cuerpoTablaPrincipal button[data-id="${idInsumo}"]`);
            const fila = botonFila ? botonFila.closest('tr') : null;

            if (fila) {
                // Selector exacto: Segunda columna (Stock), primer elemento con clase .badge
                const celdaStock = fila.querySelector('td:nth-child(2) .badge');

                if (celdaStock) {
                    const stockActual = parseFloat(celdaStock.textContent) || 0;
                    const cantidadAjuste = parseFloat(cantidad);

                    // Calculamos el nuevo stock en caliente
                    let nuevoStock = stockActual;
                    if (tipo === 'INGRESO') {
                        nuevoStock = stockActual + cantidadAjuste;
                    } else {
                        // Evitamos que baje de 0 para mantener la integridad visual
                        nuevoStock = Math.max(0, stockActual - cantidadAjuste);
                    }

                    // Inyectamos el entero redondeado al badge para mantener la simetría Shadcn
                    celdaStock.textContent = Math.round(nuevoStock);
                }
            }

            // Recalculas el paginador por si el cambio afecta los filtros o el orden
            sincronizarFiltrosYPaginas();

        } else {
            const err = await res.text();
            AppUtils.showNotification('Error: ' + err, 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión', 'error');
    }
}