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

    // Controlar el mensaje de vacío
    manejadorMensajeNoResultados('#cuerpoTablaPrincipal', contadorVisibles, 4);

    // Recalcular la paginación sobre los ítems que pasaron el filtro del buscador
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

/**
 * Motor de fraccionamiento físico de filas e inyección de paginadores Shadcn
 */
/**
 * Motor de fraccionamiento físico de filas e inyección de paginadores Shadcn con texto informativo
 */
function ejecutarPaginacionTabla(selectorFilas, selectorPaginador, paginaActual, limiteFilas, callbackPagina) {
    const filas = Array.from(document.querySelectorAll(selectorFilas));
    const paginador = document.querySelector(selectorPaginador);
    if (!paginador) return;

    // Evaluamos estrictamente las filas que no están ocultas por el filtro de texto
    const filasFiltradas = filas.filter(f => f.getAttribute('data-filtro-oculto') !== 'true');
    const totalFilas = filasFiltradas.length;
    // Forzamos a que como mínimo exista 1 página siempre
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

    // Actualización del texto informativo de registros (Izquierda)
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

    // ─── RENDERS DE BOTONERA ESTÁTICA SIEMPRE VISIBLE ───
    paginador.innerHTML = '';

    // 1. Botón Anterior (Se deshabilita si estás en la página 1)
    const btnAnt = document.createElement('li');
    btnAnt.className = `page-item-jama ${paginaActual === 1 ? 'disabled' : ''}`;
    btnAnt.innerHTML = `<button class="page-link-jama">ANTERIOR</button>`;
    if (paginaActual > 1) {
        btnAnt.onclick = () => { callbackPagina(paginaActual - 1); sincronizarFiltrosYPaginas(); };
    }
    paginador.appendChild(btnAnt);

    // 2. Números de Páginas (Imprime el "1" obligatoriamente)
    for (let i = 1; i <= totalPaginas; i++) {
        const btnPag = document.createElement('li');
        btnPag.className = `page-item-jama ${paginaActual === i ? 'active' : ''}`;
        btnPag.innerHTML = `<button class="page-link-jama">${i}</button>`;
        btnPag.onclick = () => { if (paginaActual !== i) { callbackPagina(i); sincronizarFiltrosYPaginas(); } };
        paginador.appendChild(btnPag);
    }

    // 3. Botón Siguiente (Se deshabilita si estás en la última página o solo hay una)
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

// ─── MANEJADORES DE MODALES Y ACCIONES CRUD COMPARTIDAS ───────────────
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
        const formEliminar = document.getElementById('form-eliminar-' + id);
        if (formEliminar) formEliminar.submit();
    });
}

function manejadorModalLote(btn) {
    abrirModalLote(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'), btn.getAttribute('data-categoria'));
}

function manejadorModalProduccion(btn) {
    abrirModalProduccion(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'));
}

function manejadorModalAjuste(btn) {
    abrirModalAjuste(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'));
}

function manejadorModalKardex(btn) {
    abrirKardexPorciones(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'), btn.getAttribute('data-categoria'));
}

function manejadorModalEditar(btn) {
    prepararEdicionInsumo(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'), btn.getAttribute('data-categoria'), btn.getAttribute('data-unidad'), btn.getAttribute('data-actual'), btn.getAttribute('data-minimo'));
}

/**
 * Alterna la visibilidad de los submódulos de insumos en el cliente sin generar F5
 */
function cambiarPestañaAsincrona(pestañaDestino) {
    // 1. Ocultamos todos los paneles agregando d-none
    document.getElementById('pane-proteinas')?.classList.add('d-none');
    document.getElementById('pane-catalogo')?.classList.add('d-none');
    document.getElementById('pane-recetas')?.classList.add('d-none');

    // 2. Mostramos el panel seleccionado quitando d-none y activando su radio correspondiente
    if (pestañaDestino === 'proteinas') {
        document.getElementById('pane-proteinas')?.classList.remove('d-none');
        const radio = document.getElementById('radio-btn-proteinas');
        if (radio) radio.checked = true;
    } else if (pestañaDestino === 'catalogo') {
        document.getElementById('pane-catalogo')?.classList.remove('d-none');
        const radio = document.getElementById('radio-btn-catalogo');
        if (radio) radio.checked = true;
    } else if (pestañaDestino === 'recetas') {
        document.getElementById('pane-recetas')?.classList.remove('d-none');
        const radio = document.getElementById('radio-btn-recetas');
        if (radio) radio.checked = true;
    }

    // 3. Forzamos al motor de paginación a recalcular y reacomodar las filas de las tablas
    sincronizarFiltrosYPaginas();
}