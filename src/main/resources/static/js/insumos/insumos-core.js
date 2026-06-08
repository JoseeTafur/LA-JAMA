/**
 * LA JAMA — insumos-core.js
 * Variables globales compartidas, inicialización del DOM y funciones base.
 * Debe cargarse PRIMERO antes que cualquier otro módulo de insumos.
 */

// ─── INSTANCIAS GLOBALES DE MODALES ──────────────────────────────────
let modalNuevoInsumoInstance    = null;
let modalEditarInsumoInstance   = null;
let modalDetalleRecetaInstance  = null;
let modalLoteInstance           = null;
let modalProduccionInstance     = null;
let modalAjusteInstance         = null;
let modalKardexPorcionesInstance = null;
let modalEditarInstance         = null;

// ─── ESTADO GLOBAL DEL KARDEX ────────────────────────────────────────
let maxBloquesPorPagina     = 1;
let paginaActualKardex      = 1;
let bloquesKardexPaginados  = [];
let kardexDataFiltrada      = [];
let categoriaKardexActual   = '';
let kardexData              = [];

let ordenamientoKardexDireccion = {
    fecha:    true,
    origen:   false,
    detalle:  false,
    merma:    false,
    cantidad: false,
    saldo:    false
};

// ─── INICIALIZACIÓN DOM ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Modales Bootstrap
    const nuevoInsumoEl = document.getElementById('modalNuevoInsumo');
    if (nuevoInsumoEl) modalNuevoInsumoInstance = new bootstrap.Modal(nuevoInsumoEl);

    const editarInsumoEl = document.getElementById('modalEditarInsumo');
    if (editarInsumoEl) {
        modalEditarInsumoInstance = new bootstrap.Modal(editarInsumoEl);
        modalEditarInstance       = modalEditarInsumoInstance; // alias
    }

    const detalleRecetaEl = document.getElementById('modalDetalleReceta');
    if (detalleRecetaEl) modalDetalleRecetaInstance = new bootstrap.Modal(detalleRecetaEl);

    const loteEl = document.getElementById('modalLote');
    if (loteEl) modalLoteInstance = new bootstrap.Modal(loteEl);

    const produccionEl = document.getElementById('modalProduccion');
    if (produccionEl) modalProduccionInstance = new bootstrap.Modal(produccionEl);

    const ajusteEl = document.getElementById('modalAjuste');
    if (ajusteEl) modalAjusteInstance = new bootstrap.Modal(ajusteEl);

    const kardexEl = document.getElementById('modalKardexPorciones');
    if (kardexEl) modalKardexPorcionesInstance = new bootstrap.Modal(kardexEl);

    // Restricciones lógicas al crear nuevos insumos
    const selectCategoria = document.getElementById('selectCategoria');
    const selectUnidad    = document.getElementById('selectUnidad');

    if (selectCategoria && selectUnidad) {
        selectCategoria.addEventListener('change', function () {
            const categoria = this.value;
            Array.from(selectUnidad.options).forEach(opt => opt.disabled = false);
            if (categoria === 'PROTEINA') {
                selectUnidad.value = 'Kg';
                Array.from(selectUnidad.options).forEach(opt => {
                    if (opt.value !== '' && opt.value !== 'Kg' && opt.value !== 'Gr') {
                        opt.disabled = true;
                    }
                });
            } else {
                selectUnidad.value = '';
            }
        });
    }

    // Validación al armar recetas
    const formAsignar = document.getElementById('formAsignar');
    if (formAsignar) {
        formAsignar.addEventListener('submit', (e) => {
            const selectPlato = document.getElementById('selectProducto').value;
            if (!selectPlato) {
                e.preventDefault();
                AppUtils.showNotification('Debe seleccionar un plato base para la receta', 'error');
            } else {
                AppUtils.showLoading(true);
            }
        });
    }

    // Delegación de eventos para recetarios
    document.body.addEventListener('click', function (e) {
        if (e.target.closest('.btn-ver-receta')) {
            const btn = e.target.closest('.btn-ver-receta');
            cargarDetalleReceta(btn.dataset.id, btn.dataset.nombre);
        }
    });

    // Listener del select de lote en producción
    const selectLote = document.getElementById('prodSelectLote');
    if (selectLote) {
        selectLote.addEventListener('change', actualizarPorcionesEsperadas);
    }
});

// ─── FUNCIONES BASE COMPARTIDAS ───────────────────────────────────────

function abrirModalNuevoInsumo() {
    if (modalNuevoInsumoInstance) {
        AppUtils.clearForm('#formNuevoInsumo');
        modalNuevoInsumoInstance.show();
    }
}

function confirmarEliminacion(id) {
    AppUtils.showConfirmationDialog({
        title: '¿Eliminar insumo?',
        text: 'Se borrará de la lista de almacén general.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Eliminar'
    }, function () {
        AppUtils.showLoading(true);
        document.getElementById('form-eliminar-' + id).submit();
    });
}

function actualizarAccion(idProducto) {
    if (idProducto) {
        document.getElementById('formAsignar').action = '/insumos/producto/' + idProducto + '/agregar';
    }
}

function filtrarCatalogo() {
    const input = document.getElementById('buscadorInsumos').value.toLowerCase();
    document.querySelectorAll('.fila-insumo').forEach(fila => {
        const nombre    = fila.querySelector('.nombre-insumo').textContent.toLowerCase();
        const categoria = fila.querySelector('.categoria-insumo').textContent.toLowerCase();
        fila.style.display = (nombre.includes(input) || categoria.includes(input)) ? '' : 'none';
    });
}

function filtrarTablaPrincipal() {
    const textoBuscado = document.getElementById('buscadorPrincipal').value.toLowerCase();
    document.querySelectorAll('#cuerpoTablaPrincipal .fila-insumo-principal').forEach(fila => {
        const nombre = fila.querySelector('.nombre-insumo-principal').textContent.toLowerCase();
        fila.style.display = nombre.includes(textoBuscado) ? '' : 'none';
    });
}

function safeGetValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
}

// ─── MANEJADORES HTML → JS (puentes onclick del HTML) ────────────────

function manejadorModalLote(btn) {
    abrirModalLote(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-nombre'),
        btn.getAttribute('data-categoria')
    );
}

function manejadorModalProduccion(btn) {
    abrirModalProduccion(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-nombre')
    );
}

function manejadorModalAjuste(btn) {
    abrirModalAjuste(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-nombre')
    );
}

function manejadorModalKardex(btn) {
    abrirKardexPorciones(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-nombre'),
        btn.getAttribute('data-categoria')
    );
}

function manejadorModalEditar(btn) {
    prepararEdicionInsumo(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-nombre'),
        btn.getAttribute('data-categoria'),
        btn.getAttribute('data-unidad'),
        btn.getAttribute('data-actual'),
        btn.getAttribute('data-minimo')
    );
}

function validarYConfirmarNuevoInsumo() {
    const form = document.getElementById('formNuevoInsumo');
    const nombre = form.querySelector('input[name="nombre"]').value.trim();
    const categoria = document.getElementById('selectCategoria').value;
    const unidad = document.getElementById('selectUnidad').value;
    const minimo = form.querySelector('input[name="stockMinimo"]').value;

    if (!nombre) { AppUtils.showNotification('Ingresa el nombre del insumo', 'error'); return; }
    if (!categoria) { AppUtils.showNotification('Selecciona una categoría', 'error'); return; }
    if (!unidad) { AppUtils.showNotification('Selecciona una unidad de medida', 'error'); return; }
    if (!minimo || parseFloat(minimo) <= 0) { AppUtils.showNotification('Ingresa un stock mínimo válido', 'error'); return; }

    let tiempoRestante = 5;

    Swal.fire({
        title: '<span style="color: #1B3A2C; font-weight: 800;">¿Confirmar Unidad de Medida?</span>',
        html: `Estás registrando <strong>${nombre}</strong> en <strong>[${unidad}]</strong>.<br><br>
               <span style="color: #dc3545; font-weight: bold; font-size: 0.85rem;">
                  ⚠️ ATENCIÓN: La unidad de medida NO podrá ser modificada después para proteger las fórmulas de cocina.
               </span>`,
        icon: 'warning',
        background: '#FFF7ED',
        showCancelButton: true,
        confirmButtonColor: '#1B3A2C',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Aceptar (${tiempoRestante}s)`,
        cancelButtonText: 'Cancelar',
        didOpen: () => {
            const botonConfirmar = Swal.getConfirmButton();
            botonConfirmar.disabled = true;

            const intervalo = setInterval(() => {
                tiempoRestante--;
                if (tiempoRestante > 0) {
                    botonConfirmar.innerText = `Aceptar (${tiempoRestante}s)`;
                } else {
                    clearInterval(intervalo);
                    botonConfirmar.innerText = 'Sí, Aceptar';
                    botonConfirmar.disabled = false; // Se libera el botón
                }
            }, 1000);
        }
    }).then((result) => {
        if (result.isConfirmed) {
            AppUtils.showLoading(true);
            if (modalNuevoInsumoInstance) modalNuevoInsumoInstance.hide();
            form.submit();
        }
    });
}
// Validación al armar recetas (NUEVA MATRIZ)
    const formAsignarMasivo = document.getElementById('formAsignarMasivo');
    if (formAsignarMasivo) {
        formAsignarMasivo.addEventListener('submit', (e) => {
            const selectPlato = document.getElementById('selectProductoMatriz').value;
            if (!selectPlato) {
                e.preventDefault();
                AppUtils.showNotification('Debe seleccionar un plato destino para la receta', 'error');
            } else {
                AppUtils.showLoading(true);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {

        // 1. EVENTO: Cuando seleccionamos un plato del dropdown
        const selectPlatoMatriz = document.getElementById('selectProductoMatriz');
        if (selectPlatoMatriz) {
            selectPlatoMatriz.addEventListener('change', async function() {
                const idProducto = this.value;

                // Limpiamos visualmente toda la matriz (desmarcamos todo)
                document.querySelectorAll('.check-insumo-receta').forEach(chk => {
                    chk.checked = false;
                    const fila = chk.closest('.recipe-matrix-item');
                    if (fila) fila.classList.remove('item-selected');
                });
                document.querySelectorAll('.input-portion-jama').forEach(inp => {
                    inp.value = '1.0'; // Reseteamos al valor por defecto
                });

                // Si volvió al "Buscar plato...", no hacemos nada más
                if (!idProducto) return;

                // Traemos la receta actual desde el backend
                try {
                    AppUtils.showLoading(true);
                    const response = await fetch(`/insumos/producto/${idProducto}`);
                    const receta = await response.json();

                    // Pintamos los checks y llenamos las porciones con los datos guardados
                    receta.forEach(item => {
                        // OJO: Aquí leemos el ID del insumo que viene de tu DTO
                        const idInsumo = item.idInsumo || item.insumoId;

                        const checkbox = document.getElementById(`check-${idInsumo}`);
                        if (checkbox) {
                            checkbox.checked = true; // Lo marcamos

                            // Iluminamos la fila
                            const fila = checkbox.closest('.recipe-matrix-item');
                            if (fila) fila.classList.add('item-selected');

                            // Le ponemos la cantidad de porciones exacta que guardaste
                            const inputPorciones = document.querySelector(`input[name="porciones-${idInsumo}"]`);
                            if (inputPorciones) {
                                inputPorciones.value = item.cantidadUsada;
                            }
                        }
                    });
                } catch (e) {
                    console.error("Error al cargar la receta persistente:", e);
                    AppUtils.showNotification('Error al cargar la receta guardada', 'error');
                } finally {
                    AppUtils.showLoading(false);
                }
            });
        }

        // 2. EVENTO: Iluminar la fila cuando el usuario hace clic manual en un checkbox
        document.querySelectorAll('.check-insumo-receta').forEach(chk => {
            chk.addEventListener('change', function() {
                const fila = this.closest('.recipe-matrix-item');
                if (this.checked) {
                    fila.classList.add('item-selected');
                } else {
                    fila.classList.remove('item-selected');
                    // Opcional: si lo desmarca, reseteamos su input a 1.0 por limpieza
                    const inputP = document.querySelector(`input[name="porciones-${this.value}"]`);
                    if(inputP) inputP.value = '1.0';
                }
            });
        });

        // 3. EVENTO: Buscador rápido interno de la matriz
        const buscadorMatriz = document.getElementById('buscarInsumoMatriz');
        if (buscadorMatriz) {
            buscadorMatriz.addEventListener('keyup', function() {
                const textoBusqueda = this.value.toLowerCase().trim();
                document.querySelectorAll('.recipe-matrix-item').forEach(fila => {
                    const nombreInsumo = fila.querySelector('label').textContent.toLowerCase();
                    if (nombreInsumo.includes(textoBusqueda)) {
                        fila.style.display = ''; // Mostrar
                    } else {
                        fila.style.display = 'none'; // Ocultar
                    }
                });
            });
        }
    });
