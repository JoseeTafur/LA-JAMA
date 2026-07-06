/**
 * LA JAMA — insumos-recetas.js
 * Visualización y edición de recetarios activos por producto.
 * Depende de: insumos-core.js
 */

let idProductoActivo = null; // 🚀 Almacenamos el contexto del plato actual para refrescos dinámicos
let nombreProductoActivo = "";

// ─── 1. CONTROL DE DETALLES (Insumosgestion.html) ───────────────────
async function cargarDetalleReceta(idProducto, nombreProducto) {
    idProductoActivo = idProducto;
    nombreProductoActivo = nombreProducto;

    document.getElementById('tituloModalReceta').innerHTML =
        `<i class="bi bi-journal-text me-2"></i>Receta: ${nombreProducto}`;

    const cuerpo = document.getElementById('cuerpoDetalleReceta');
    cuerpo.innerHTML = `
        <tr>
            <td colspan="4" class="text-center py-4">
                <div class="spinner-border text-success" role="status"></div><br>Cargando...
            </td>
        </tr>`;

    if (modalDetalleRecetaInstance) modalDetalleRecetaInstance.show();

    try {
        const response = await fetch(`/insumos/producto/${idProducto}`);
        const datos    = await response.json();

        if (datos.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No hay insumos asignados a este plato.</td></tr>';
            return;
        }

        cuerpo.innerHTML = datos.map(item => `
            <tr>
                <td class="ps-3 fw-semibold text-dark">${item.nombreInsumo}</td>
                <td class="text-muted">${item.unidadMedida}</td>
                <td class="text-end fw-bold">${item.cantidadUsada}</td>
                <td class="text-center pe-3">
                    <button type="button" class="btn btn-sm text-danger p-1" title="Quitar de la receta"
                            onclick="confirmarQuitarInsumo(${item.id}, '${item.nombreInsumo}')">
                        <i class="bi bi-x-circle-fill fs-5"></i>
                    </button>
                </td>
            </tr>`).join('');

    } catch (error) {
        cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error al cargar la receta.</td></tr>';
    }
}

// 🚀 BORRADO ASÍNCRONO SIN RECARGAR PÁGINA (LA JAMA LOGÍSTICA)
function confirmarQuitarInsumo(idInsumoProducto, nombreInsumo) {
    AppUtils.showConfirmationDialog({
        title: '¿Quitar de la receta?',
        text: `El insumo [${nombreInsumo}] dejará de descontarse al preparar este plato.`,
        icon: 'warning',
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Quitar'
    }, async function () {
        AppUtils.showLoading(true);

        try {
            const response = await fetch(`/admin/insumos/receta/eliminar/${idInsumoProducto}`, {
                method: 'POST'
            });

            AppUtils.showLoading(false);

            if (response.ok) {
                AppUtils.showNotification('Ingrediente removido de la receta con éxito', 'success');
                // Refrescamos dinámicamente la tabla sin cerrar el modal
                cargarDetalleReceta(idProductoActivo, nombreProductoActivo);
            } else {
                AppUtils.showNotification('No se pudo quitar el insumo del recetario', 'error');
            }
        } catch (error) {
            AppUtils.showLoading(false);
            console.error("Error al remover de la receta:", error);
            AppUtils.showNotification('Fallo de comunicación con el servidor', 'error');
        }
    });
}

function prepararEdicionInsumo(id, nombre, categoria, unidad, actual, minimo) {
    document.getElementById('editInsumoId').value        = id;
    document.getElementById('editInsumoNombre').value    = nombre;
    document.getElementById('editInsumoCategoria').value = categoria;
    document.getElementById('editInsumoUnidad').value    = unidad;

    const inputActual = document.getElementById('editInsumoStockActual');
    if (inputActual) inputActual.value = actual || 0;

    const inputMinimo = document.getElementById('editInsumoStockMinimo');
    if (inputMinimo) inputMinimo.value = minimo || 0;

    // 🛡️ ADUANA DEL FORMULARIO DE EDICIÓN: Escuchamos el submit para interceptar datos corruptos
    const formEditar = document.getElementById('formEditarInsumo') || (inputMinimo ? inputMinimo.closest('form') : null);
    if (formEditar) {
        formEditar.onsubmit = function (e) {
            const nombreVal = document.getElementById('editInsumoNombre').value.trim();
            const minimoVal = parseFloat(document.getElementById('editInsumoStockMinimo').value);

            // 1. Validamos que el nombre no contenga números, símbolos o emojis
            const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/;
            if (!nombreVal || !regexLetras.test(nombreVal)) {
                e.preventDefault();
                AppUtils.showNotification('El nombre del insumo es obligatorio y solo puede contener letras.', 'error');
                return false;
            }

            // 2. Validamos que el stock mínimo no sea negativo
            if (isNaN(minimoVal) || minimoVal < 0) {
                e.preventDefault();
                AppUtils.showNotification('El stock mínimo no puede ser un número negativo.', 'error');
                return false;
            }

            AppUtils.showLoading(true);
            return true;
        };
    }

    if (modalEditarInstance) modalEditarInstance.show();
}

function actualizarPlaceholderReceta(select) {
    const option   = select.options[select.selectedIndex];
    if (!option) return;

    const categoria = option.getAttribute('data-categoria');
    const unidad    = option.getAttribute('data-unidad');
    const input     = document.getElementById('inputCantidadReceta');
    if (!input) return;

    // 🛡️ Bloqueamos físicamente el input desde el HTML para que el teclado numérico no permita el signo "-"
    input.min = "0.001";
    input.type = "number";
    input.step = "0.001";

    if (categoria === 'PROTEINA') {
        input.placeholder = "Para proteínas ingresa 1 (porción)";
        input.value = 1;
    } else if (unidad) {
        input.placeholder = `Cantidad requerida en ${unidad} (Ej: 0.2)`;
        input.value = '';
    } else {
        input.placeholder = "Cantidad requerida";
    }

    // 🛡️ Escudo en caliente (Evita el bypass si presionan submit rápido)
    input.oninput = function() {
        if (parseFloat(this.value) < 0) {
            this.value = '';
        }
    };

    const formAgregarIngrediente = input.closest('form');
    if (formAgregarIngrediente) {
        formAgregarIngrediente.onsubmit = function(e) {
            const cantidadVal = parseFloat(input.value);
            if (isNaN(cantidadVal) || cantidadVal <= 0) {
                e.preventDefault();
                AppUtils.showNotification('La cantidad de ingrediente en la receta debe ser mayor a cero.', 'error');
                return false;
            }
            AppUtils.showLoading(true);
            return true;
        };
    }
}

window.cargarDetalleReceta = cargarDetalleReceta;