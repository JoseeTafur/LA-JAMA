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

    // 🌟 CANDADO DE FRONTEND: Evitar envíos que fuercen stock menor a cero
    const botonFila = document.querySelector(`#cuerpoTablaPrincipal button[data-id="${idInsumo}"]`);
    const fila = botonFila ? botonFila.closest('tr') : null;

    if (fila && tipo === 'EGRESO') {
        const celdaStock = fila.querySelector('td:nth-child(2) .badge');
        if (celdaStock) {
            const stockActual = parseFloat(celdaStock.textContent) || 0;
            if (parseInt(cantidad) > stockActual) {
                // Detiene el proceso antes de tocar al servidor
                AppUtils.showNotification(`Operación cancelada. Solo cuentas con ${stockActual} porciones disponibles.`, 'error');
                return;
            }
        }
    }

    AppUtils.showLoading(true);
    try {
        const params = new URLSearchParams({ idInsumo, cantidad, tipo, motivo });
        const res = await fetch('/proteinas/movimientos/ajustar?' + params.toString(), { method: 'POST' });

        AppUtils.showLoading(false);

        if (res.ok) {
            modalAjusteInstance?.hide();
            AppUtils.showNotification('Ajuste de porciones registrado', 'success');

            // 🌟 Declaramos las referencias en un scope accesible
            let celdaStockActualizada = null;
            let nuevoStockCalculado = 0;

            if (fila) {
                const celdaStock = fila.querySelector('td:nth-child(2) .badge');
                if (celdaStock) {
                    const stockActual = parseFloat(celdaStock.textContent) || 0;
                    const cantidadAjuste = parseFloat(cantidad);

                    if (tipo === 'INGRESO') {
                        nuevoStockCalculado = stockActual + cantidadAjuste;
                    } else {
                        nuevoStockCalculado = Math.max(0, stockActual - cantidadAjuste);
                    }

                    celdaStock.textContent = Math.round(nuevoStockCalculado);

                    // Asignamos las referencias para usarlas afuera
                    celdaStockActualizada = celdaStock;
                }
            }

            // 🌟 Ahora sí, pasamos las variables con total seguridad
            if (celdaStockActualizada) {
                actualizarSemaforoVisualStock(celdaStockActualizada, nuevoStockCalculado, true);
            }

            sincronizarFiltrosYPaginas();
        } else {
            // 🚨 Si pasa los controles de front pero rebota en BD, capturamos la frase del catch del controller
            const mensajeError = await res.text();
            AppUtils.showNotification(mensajeError || 'No se pudo realizar el ajuste', 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión con el servidor', 'error');
    }
}