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

// ─── ESTADO GLOBAL DEL KARDEX Y REGISTROS ────────────────────────────
let maxBloquesPorPagina     = 1;
let paginaActualKardex      = 1;
let bloquesKardexPaginados  = [];
let kardexDataFiltrada      = [];
let categoriaKardexActual   = '';
let kardexData              = [];

let paginaActualPrincipal = 1;
let limiteFilasPrincipal  = 10;

let paginaActualCatalogo  = 1;
let limiteFilasCatalogo   = 10;

let ordenamientoKardexDireccion = {
    fecha:    true,
    origen:   false,
    detalle:  false,
    merma:    false,
    cantidad: false,
    saldo:    false
};

// ─── INICIALIZACIÓN DOM UNIFICADA Y SEGURA ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
        // 🛡️ CONTROL ULTRA-ESTRICTO DE FECHAS PARA EL KARDEX (LA JAMA 2026)
        // =========================================================================
        const inputFechaInicio = document.getElementById('searchKardexFechaInicio');
        const inputFechaFin = document.getElementById('searchKardexFechaFin');

        if (inputFechaInicio && inputFechaFin) {
            // 1. Calculamos la fecha de hoy en formato ISO local (YYYY-MM-DD)
            const hoy = new Date().toLocaleDateString('sv-SE'); // 'sv-SE' fuerza el formato exacto YYYY-MM-DD

            // 2. Aplicamos las reglas de negocio directo a las propiedades físicas del navegador
            inputFechaInicio.min = "2026-01-01"; // 🔒 Forzado estrictamente a este año
            inputFechaInicio.max = hoy;          // 🔒 No puede superar el día de hoy

            inputFechaFin.min = "2026-01-01";
            inputFechaFin.max = hoy;             // 🔒 No puede ir más allá de la fecha actual

            // 3. Escucha dinámica para Fecha Inicio: Modifica el rango permitido de Fecha Fin
            inputFechaInicio.addEventListener('change', function() {
                if (this.value) {
                    // La fecha fin no puede ser anterior a la fecha de inicio seleccionada
                    inputFechaFin.min = this.value;
                }
                // Si tu función de filtrado nativa existe, la invoca
                if (typeof ejecutarFiltroCombinadoKardex === "function") {
                    ejecutarFiltroCombinadoKardex();
                }
            });

            // 4. Escucha dinámica para Fecha Fin: Modifica el rango permitido de Fecha Inicio
            inputFechaFin.addEventListener('change', function() {
                if (this.value) {
                    // La fecha inicio no puede ser posterior a la fecha fin seleccionada
                    inputFechaInicio.max = this.value;
                }
                if (typeof ejecutarFiltroCombinadoKardex === "function") {
                    ejecutarFiltroCombinadoKardex();
                }
            });
        }

    // Modales Bootstrap (Solo se inicializan si el nodo existe físicamente)
    const nuevoInsumoEl = document.getElementById('modalNuevoInsumo');
    if (nuevoInsumoEl) modalNuevoInsumoInstance = new bootstrap.Modal(nuevoInsumoEl);

    const editarInsumoEl = document.getElementById('modalEditarInsumo');
    if (editarInsumoEl) {
        modalEditarInsumoInstance = new bootstrap.Modal(editarInsumoEl);
        modalEditarInstance       = modalEditarInsumoInstance;
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

    // Inicializar corte de paginación física al cargar la pestaña
    if (document.getElementById('cuerpoTablaPrincipal')) {
        ejecutarPaginacionTabla('#cuerpoTablaPrincipal tr:not(.fila-no-results)', '#paginadorPrincipal', paginaActualPrincipal, limiteFilasPrincipal, (p) => { paginaActualPrincipal = p; });
    }
    if (document.getElementById('tablaCatalogo')) {
        ejecutarPaginacionTabla('#tablaCatalogo tbody tr:not(.fila-no-results)', '#paginadorCatalogo', paginaActualCatalogo, limiteFilasCatalogo, (p) => { paginaActualCatalogo = p; });
    }

    // 🛡️ ESCUDO DE VALIDACIÓN: Crear Nuevo Insumo
    const formNuevoInsumo = document.getElementById('formNuevoInsumo');
    if (formNuevoInsumo) {
        // Forzamos límites nativos en el HTML del input de stock mínimo nuevo
        const inputMinimoNuevo = formNuevoInsumo.querySelector('input[name="stockMinimo"]');
        if (inputMinimoNuevo) {
            inputMinimoNuevo.min = "0";
            inputMinimoNuevo.type = "number";
            inputMinimoNuevo.step = "0.01";
        }

        formNuevoInsumo.addEventListener('submit', (e) => {
            // Buscamos los inputs por sus atributos name o clases dentro del form
            const inputNombre = formNuevoInsumo.querySelector('input[name="nombre"]')?.value.trim();
            const valMinimo = parseFloat(inputMinimoNuevo?.value);

            // 1. Validar nombre limpio (solo letras y espacios)
            const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/;
            if (!inputNombre || !regexLetras.test(inputNombre)) {
                e.preventDefault();
                AppUtils.showNotification('El nombre del insumo es obligatorio y solo puede contener letras.', 'error');
                return false;
            }

            // 2. Validar que el stock mínimo no sea negativo
            if (isNaN(valMinimo) || valMinimo < 0) {
                e.preventDefault();
                AppUtils.showNotification('El stock mínimo no puede ser un número negativo.', 'error');
                return false;
            }

            AppUtils.showLoading(true);
        });
    }

    // Restricciones lógicas al crear nuevos insumos (Selector de unidades)
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
            const selectPlato = document.getElementById('selectProducto')?.value;
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

    // Buscador rápido interno de ingredientes (Matriz de Recetas)
    const buscadorMatriz = document.getElementById('buscarInsumoMatriz');
    if (buscadorMatriz) {
        buscadorMatriz.addEventListener('keyup', function() {
            const textoBusqueda = this.value.toLowerCase().trim();
            document.querySelectorAll('.recipe-matrix-item').forEach(fila => {
                const label = fila.querySelector('label');
                if (label) {
                    const nombreInsumo = label.textContent.toLowerCase();
                    fila.style.display = nombreInsumo.includes(textoBusqueda) ? '' : 'none';
                }
            });
        });
    }
});

// ─── LÓGICA DE FILTRADO Y PAGINACIÓN INTEGRADA ───────────────────────

function filtrarTablaPrincipal() {
    const buscador = document.getElementById('buscadorPrincipal');
    if (!buscador) return;

    const textoBuscado = buscador.value.toLowerCase().trim();
    const filas = document.querySelectorAll('#cuerpoTablaPrincipal tr:not(.fila-no-results)');
    let contadorVisibles = 0;

    filas.forEach(fila => {
        const primeraCelda = fila.querySelector('td:first-child');
        if (primeraCelda) {
            const nombre = primeraCelda.textContent.toLowerCase();
            if (nombre.includes(textoBuscado)) {
                fila.removeAttribute('data-filtro-oculto');
                contadorVisibles++;
            } else {
                fila.setAttribute('data-filtro-oculto', 'true');
                fila.style.display = 'none';
            }
        }
    });

    manejadorMensajeNoResultados('#cuerpoTablaPrincipal', contadorVisibles, 4);
    ejecutarPaginacionTabla('#cuerpoTablaPrincipal tr:not(.fila-no-results)', '#paginadorPrincipal', paginaActualPrincipal, limiteFilasPrincipal, (p) => { paginaActualPrincipal = p; });
}

function filtrarCatalogo() {
    const buscador = document.getElementById('buscadorInsumos');
    if (!buscador) return;

    const input = buscador.value.toLowerCase().trim();
    const filas = document.querySelectorAll('#tablaCatalogo tbody tr:not(.fila-no-results)');
    let contadorVisibles = 0;

    filas.forEach(fila => {
        const celdaNombre = fila.querySelector('td:nth-child(1)');
        const celdaCategoria = fila.querySelector('td:nth-child(2)');

        if (celdaNombre) {
            const nombre = celdaNombre.textContent.toLowerCase();
            const categoria = celdaCategoria ? celdaCategoria.textContent.toLowerCase() : '';

            if (nombre.includes(input) || categoria.includes(input)) {
                fila.removeAttribute('data-filtro-oculto');
                contadorVisibles++;
            } else {
                fila.setAttribute('data-filtro-oculto', 'true');
                fila.style.display = 'none';
            }
        }
    });

    manejadorMensajeNoResultados('#tablaCatalogo tbody', contadorVisibles, 5);
    ejecutarPaginacionTabla('#tablaCatalogo tbody tr:not(.fila-no-results)', '#paginadorCatalogo', paginaActualCatalogo, limiteFilasCatalogo, (p) => { paginaActualCatalogo = p; });
}

function cambiarLimiteFilasPrincipal() {
    const selector = document.getElementById('registrosPorPaginaPrincipal');
    if (selector) {
        limiteFilasPrincipal = parseInt(selector.value);
        paginaActualPrincipal = 1;
        filtrarTablaPrincipal();
    }
}

function cambiarLimiteFilasCatalogo() {
    const selector = document.getElementById('registrosPorPaginaCatalogo');
    if (selector) {
        limiteFilasCatalogo = parseInt(selector.value);
        paginaActualCatalogo = 1;
        filtrarCatalogo();
    }
}

function ejecutarPaginacionTabla(selectorFilas, selectorPaginador, paginaActual, limiteFilas, callbackPagina) {
    const filas = Array.from(document.querySelectorAll(selectorFilas));
    const paginador = document.querySelector(selectorPaginador);
    if (!paginador) return;

    const filasFiltradas = filas.filter(f => f.getAttribute('data-filtro-oculto') !== 'true');
    const totalFilas = filasFiltradas.length;
    const totalPaginas = Math.max(1, Math.ceil(totalFilas / limiteFilas));

    if (paginaActual > totalPaginas) paginaActual = 1;
    if (totalPaginas === 0) paginaActual = 1;
    callbackPagina(paginaActual);

    const inicio = (paginaActual - 1) * limiteFilas;
    const fin = inicio + limiteFilas;

    filasFiltradas.forEach((fila, indice) => {
        if (indice >= inicio && indice < fin) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });

    const infoId = selectorPaginador === '#paginadorPrincipal' ? 'infoRegistrosPrincipal' : 'infoRegistrosCatalogo';
    const infoContenedor = document.getElementById(infoId);
    if (infoContenedor) {
        if (totalFilas === 0) {
            infoContenedor.textContent = "Mostrando registros del 0 al 0 de un total de 0 registros";
        } else {
            const registroInicio = inicio + 1;
            const registroFin = Math.min(fin, totalFilas);
            infoContenedor.textContent = `Mostrando registros del ${registroInicio} al ${registroFin} de un total de ${totalFilas} registros`;
        }
    }

    paginador.innerHTML = '';

    const btnAnt = document.createElement('li');
    btnAnt.className = `page-item-jama ${paginaActual === 1 ? 'disabled' : ''}`;
    btnAnt.innerHTML = `<button class="page-link-jama">ANTERIOR</button>`;
    if (paginaActual > 1) {
        btnAnt.onclick = () => { callbackPagina(paginaActual - 1); sincronizarFiltrosYPaginas(); };
    }
    paginador.appendChild(btnAnt);

    for (let i = 1; i <= totalPaginas; i++) {
        const btnPag = document.createElement('li');
        btnPag.className = `page-item-jama ${paginaActual === i ? 'active' : ''}`;
        btnPag.innerHTML = `<button class="page-link-jama">${i}</button>`;
        btnPag.onclick = () => { if (paginaActual !== i) { callbackPagina(i); sincronizarFiltrosYPaginas(); } };
        paginador.appendChild(btnPag);
    }

    const btnSig = document.createElement('li');
    btnSig.className = `page-item-jama ${paginaActual === totalPaginas ? 'disabled' : ''}`;
    btnSig.innerHTML = `<button class="page-link-jama">SIGUIENTE</button>`;
    if (paginaActual < totalPaginas) {
        btnSig.onclick = () => { callbackPagina(paginaActual + 1); sincronizarFiltrosYPaginas(); };
    }
    paginador.appendChild(btnSig);
}

function sincronizarFiltrosYPaginas() {
    if (document.getElementById('cuerpoTablaPrincipal')) {
        ejecutarPaginacionTabla('#cuerpoTablaPrincipal tr:not(.fila-no-results)', '#paginadorPrincipal', paginaActualPrincipal, limiteFilasPrincipal, (p) => { paginaActualPrincipal = p; });
    }
    if (document.getElementById('tablaCatalogo')) {
        ejecutarPaginacionTabla('#tablaCatalogo tbody tr:not(.fila-no-results)', '#paginadorCatalogo', paginaActualCatalogo, limiteFilasCatalogo, (p) => { paginaActualCatalogo = p; });
    }
}

function manejadorMensajeNoResultados(idContenedor, itemsVisibles, totalColumnas) {
    const contenedor = document.querySelector(idContenedor);
    if (!contenedor) return;

    let filaMensaje = contenedor.querySelector('.fila-no-results');

    if (itemsVisibles === 0) {
        if (!filaMensaje) {
            filaMensaje = document.createElement('tr');
            filaMensaje.className = 'fila-no-results animate__animated animate__fadeIn';
            filaMensaje.innerHTML = `
                <td colspan="${totalColumnas}" class="text-center py-5 text-muted bg-light-jama">
                    <div class="d-flex flex-column align-items-center justify-content-center gap-2">
                        <i class="bi bi-folder-x fs-2" style="color: var(--lajama-skin);"></i>
                        <span class="fw-semibold small" style="color: var(--lajama-green);">No se encontraron insumos que coincidan con la búsqueda</span>
                    </div>
                </td>`;
            contenedor.appendChild(filaMensaje);
        }
    } else {
        if (filaMensaje) filaMensaje.remove();
    }
}

function abrirModalNuevoInsumo() {
    if (modalNuevoInsumoInstance) {
        AppUtils.clearForm('#formNuevoInsumo');
        modalNuevoInsumoInstance.show();
    }
}

function confirmarEliminacion(id) {
    Swal.fire({
        title: '<span style="color: var(--lajama-green); font-weight: 800;">¿Estás seguro de eliminar este insumo?</span>',
        html: `<div class="text-start small p-2 rounded" style="background-color: var(--lajama-cream); border: 1px dashed rgba(27,58,44,0.15); font-family: system-ui, sans-serif;">
                <p class="mb-2">⚠️ <strong>Impacto en Recetas:</strong> Se desvinculará automáticamente de todas las fórmulas de platos donde esté asignado actualmente.</p>
                <p class="mb-0">📊 <strong>Impacto en Almacén:</strong> El insumo desaparecerá de las listas operativas, pero su historial (Kardex) quedará archivado de forma segura.</p>
               </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, archivar e inactivar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                AppUtils.showLoading(true);
                const res = await fetch(`/insumos/eliminar/${id}`, { method: 'POST' });
                AppUtils.showLoading(false);

                if (res.ok) {
                    AppUtils.showNotification('Insumo archivado y recetas purgadas con éxito', 'success');

                    const dogTacho = document.querySelector(`#tablaCatalogo button.btn-action-delete[data-id="${id}"]`);
                    const filaCatalogo = dogTacho ? dogTacho.closest('tr') : null;
                    if (filaCatalogo) {
                        filaCatalogo.classList.add('animate__animated', 'animate__fadeOutLeft');
                        setTimeout(() => filaCatalogo.remove(), 400);
                    }

                    const botonPorciones = document.querySelector(`#cuerpoTablaPrincipal button[data-id="${id}"]`);
                    const filaPorciones = botonPorciones ? botonPorciones.closest('tr') : null;
                    if (filaPorciones) {
                        filaPorciones.classList.add('animate__animated', 'animate__fadeOutLeft');
                        setTimeout(() => filaPorciones.remove(), 400);
                    }

                    setTimeout(() => {
                        filtrarCatalogo();
                        filtrarTablaPrincipal();
                    }, 450);

                } else {
                    const errText = await res.text();
                    AppUtils.showNotification('No se pudo procesar la baja: ' + errText, 'error');
                }
            } catch (error) {
                AppUtils.showLoading(false);
                AppUtils.showNotification('Fallo de comunicación con el servidor', 'error');
            }
        }
    });
}

function manejadorModalLote(btn) { abrirModalLote(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'), btn.getAttribute('data-categoria')); }
// ... (Los demás manejadores conservan su firma estructural limpia)
function manejadorModalProduccion(btn) { abrirModalProduccion(btn.getAttribute('data-id'), btn.getAttribute('data-nombre')); }
function manejadorModalAjuste(btn) { abrirModalAjuste(btn.getAttribute('data-id'), btn.getAttribute('data-nombre')); }
function manejadorModalKardex(btn) { abrirKardexPorciones(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'), btn.getAttribute('data-categoria')); }
function manejadorModalEditar(btn) {
    prepararEdicionInsumo(
        btn.getAttribute('data-id'),
        btn.getAttribute('data-nombre'),
        btn.getAttribute('data-categoria'),
        btn.getAttribute('data-unidad'),
        btn.getAttribute('data-minimo')
    );
}

function prepararEdicionInsumo(id, nombre, categoria, unidadMedida, stockMinimo) {
    // Inyección de textos planos en el formulario del modal de edición
    document.getElementById('editInsumoId').value = id;
    ddocument.getElementById('editInsumoNombre').value = nombre ? nombre.trim() : "";
    document.getElementById('editInsumoUnidad').value = unidadMedida;
    document.getElementById('editInsumoStockMinimo').value = stockMinimo;

    // CONTROL DE INYECCIÓN DE CATEGORÍA
    const selectCategoria = document.getElementById('editarCategoria');
    if (selectCategoria && categoria) {
        selectCategoria.value = categoria.toUpperCase().trim();
    }

    // 🛡️ ESCUDO DETECTOR PARA EL FORMULARIO DE EDICIÓN DEL CATÁLOGO
    // Buscamos el formulario dentro del modal de edición (por id o tag)
    const formEditar = document.getElementById('formEditarInsumo') || document.querySelector('#modalEditarInsumo form');
    if (formEditar) {
        // Aseguramos que el input numérico de la edición tampoco acepte negativos de forma nativa
        const inputMinimoEdit = formEditar.querySelector('input[name="stockMinimo"]') || document.getElementById('editInsumoStockMinimo');
        if (inputMinimoEdit) {
            inputMinimoEdit.min = "0";
            inputMinimoEdit.type = "number";
        }

        formEditar.onsubmit = function (e) {
            const nombreVal = document.getElementById('editInsumoNombre').value.trim();
            const minimoVal = parseFloat(inputMinimoEdit?.value);

            // 1. Validar que el nombre no contenga números, símbolos o emojis antes de viajar al backend
            const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/;
            if (!nombreVal || !regexLetras.test(nombreVal)) {
                e.preventDefault(); // 🛑 Detiene el envío de inmediato
                AppUtils.showNotification('No se pudo guardar: El nombre del insumo solo puede contener letras (sin números ni emojis).', 'error');
                return false;
            }

            // 2. Validar que el stock mínimo no sea negativo
            if (isNaN(minimoVal) || minimoVal < 0) {
                e.preventDefault(); // 🛑 Detiene el envío de inmediato
                AppUtils.showNotification('No se pudo guardar: El stock mínimo no puede ser un número negativo.', 'error');
                return false;
            }

            AppUtils.showLoading(true);
            return true;
        };
    }

    // Desplegamos el modal correspondiente cargado en las variables de entorno de La Jama
    if (modalEditarInsumoInstance) {
        modalEditarInsumoInstance.show();
    }
}

function cambiarPestañaAsincrona(pestañaDestino) {
    document.getElementById('pane-proteinas')?.classList.add('d-none');
    document.getElementById('pane-catalogo')?.classList.add('d-none');
    document.getElementById('pane-recetas')?.classList.add('d-none');
    document.getElementById('pane-crear-receta')?.classList.add('d-none');

    if (pestañaDestino === 'proteinas') {
        document.getElementById('pane-proteinas')?.classList.remove('d-none');
        document.getElementById('radio-btn-proteinas').checked = true;
    } else if (pestañaDestino === 'catalogo') {
        document.getElementById('pane-catalogo')?.classList.remove('d-none');
        document.getElementById('radio-btn-catalogo').checked = true;
    } else if (pestañaDestino === 'recetas') {
        document.getElementById('pane-recetas')?.classList.remove('d-none');
        document.getElementById('radio-btn-recetas').checked = true;
    } else if (pestañaDestino === 'crear-receta') {
        document.getElementById('pane-crear-receta')?.classList.remove('d-none');
        document.getElementById('radio-btn-crear-receta').checked = true;
    }
    sincronizarFiltrosYPaginas();
}

function actualizarSemaforoVisualStock(celdaStock, nuevoStock, esProteina) {
    if (!celdaStock) return;
    const stockMinimo = parseFloat(celdaStock.getAttribute('data-minimo')) || 0;

    if (nuevoStock <= stockMinimo) {
        if (esProteina) {
            celdaStock.classList.remove('bg-success');
            celdaStock.classList.add('bg-danger');
        } else {
            celdaStock.classList.remove('text-dark');
            celdaStock.classList.add('text-danger');
        }
    } else {
        if (esProteina) {
            celdaStock.classList.remove('bg-danger');
            celdaStock.classList.add('bg-success');
        } else {
            celdaStock.classList.remove('text-danger');
            celdaStock.classList.add('text-dark');
        }
    }
}