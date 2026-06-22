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
        const hoy = new Date().toLocaleDateString('sv-SE');
        inputFechaInicio.min = "2026-01-01";
        inputFechaInicio.max = hoy;
        inputFechaFin.min = "2026-01-01";
        inputFechaFin.max = hoy;

        inputFechaInicio.addEventListener('change', function() {
            if (this.value) inputFechaFin.min = this.value;
            if (typeof ejecutarFiltroCombinadoKardex === "function") ejecutarFiltroCombinadoKardex();
        });

        inputFechaFin.addEventListener('change', function() {
            if (this.value) inputFechaInicio.max = this.value;
            if (typeof ejecutarFiltroCombinadoKardex === "function") ejecutarFiltroCombinadoKardex();
        });
    }

    // Inicializar Modales
    const nuevoInsumoEl = document.getElementById('modalNuevoInsumo');
    if (nuevoInsumoEl) modalNuevoInsumoInstance = new bootstrap.Modal(nuevoInsumoEl);

    const editarInsumoEl = document.getElementById('modalEditarInsumo');
    if (editarInsumoEl) {
        modalEditarInsumoInstance = new bootstrap.Modal(editarInsumoEl);
        modalEditarInstance = modalEditarInsumoInstance;
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

    sincronizarFiltrosYPaginas();

    // Validador nativo
    const formNuevoInsumo = document.getElementById('formNuevoInsumo');
    if (formNuevoInsumo) {
        const inputMinimoNuevo = formNuevoInsumo.querySelector('input[name="stockMinimo"]');
        if (inputMinimoNuevo) {
            inputMinimoNuevo.min = "0";
            inputMinimoNuevo.step = "1"; // 🎯 Aseguramos el step aquí también
            inputMinimoNuevo.type = "number";
        }
        formNuevoInsumo.addEventListener('submit', (e) => {
            const inputNombre = formNuevoInsumo.querySelector('input[name="nombre"]')?.value.trim();

            // 🎯 Cambiado a Number para atrapar decimales
            const valMinimoRaw = inputMinimoNuevo?.value;
            const valMinimo = Number(valMinimoRaw);

            const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/;
            if (!inputNombre || !regexLetras.test(inputNombre)) {
                e.preventDefault();
                AppUtils.showNotification('El nombre solo debe contener letras.', 'error');
                return false;
            }
            if (valMinimo < 0) {
                e.preventDefault();
                AppUtils.showNotification('El stock mínimo no puede ser negativo.', 'error');
                return false;
            }

            // 🌟 NUEVA VALIDACIÓN: Bloqueo final para el formulario de nuevo insumo
            if (!Number.isInteger(valMinimo) || valMinimoRaw.includes('.') || valMinimoRaw.includes(',')) {
                e.preventDefault();
                AppUtils.showNotification('El stock mínimo debe ser un número entero.', 'error');
                return false;
            }

            AppUtils.showLoading(true);
        });
    }

    // =========================================================================
        // 🚀 DELEGACIÓN DE EVENTOS PARA ESCUCHAR CLICS EN CARTAS DE RECETAS (LA JAMA 2026)
        // =========================================================================
        document.body.addEventListener('click', (e) => {
            // Buscamos si el clic ocurrió dentro o sobre el botón de ver receta
            const botonReceta = e.target.closest('.btn-ver-receta');

            if (botonReceta) {
                e.preventDefault();
                const idProducto = botonReceta.getAttribute('data-id');
                const nombreProducto = botonReceta.getAttribute('data-nombre');

                // Verificamos si el script de recetas ya expuso la función en la ventana global
                if (typeof window.cargarDetalleReceta === 'function') {
                    window.cargarDetalleReceta(idProducto, nombreProducto);
                } else {
                    console.error("⚠️ Error: 'cargarDetalleReceta' no está disponible en el alcance global.");
                    AppUtils.showNotification('Error interno al abrir la receta. Intente recargar.', 'error');
                }
            }
        });

});

// ─── LÓGICA DE FILTRADO Y PAGINACIÓN INTEGRADA ───────────────────────
function filtrarTablaPrincipal() {
    const buscador = document.getElementById('buscadorPrincipal');
    if (!buscador) return;
    const textoBuscado = buscador.value.toLowerCase().trim();
    const filas = document.querySelectorAll('#cuerpoTablaPrincipal tr:not(.fila-no-results)');
    let contadorVisibles = 0;

    filas.forEach(fila => {
        const tdInsumo = fila.querySelector('td:first-child');
        if (tdInsumo && tdInsumo.textContent.toLowerCase().includes(textoBuscado)) {
            fila.removeAttribute('data-filtro-oculto');
            contadorVisibles++;
        } else {
            fila.setAttribute('data-filtro-oculto', 'true');
            fila.style.display = 'none';
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
            const match = celdaNombre.textContent.toLowerCase().includes(input) || (celdaCategoria && celdaCategoria.textContent.toLowerCase().includes(input));
            if (match) {
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
    if (selector) { limiteFilasPrincipal = parseInt(selector.value); paginaActualPrincipal = 1; filtrarTablaPrincipal(); }
}

function cambiarLimiteFilasCatalogo() {
    const selector = document.getElementById('registrosPorPaginaCatalogo');
    if (selector) { limiteFilasCatalogo = parseInt(selector.value); paginaActualCatalogo = 1; filtrarCatalogo(); }
}

function ejecutarPaginacionTabla(selectorFilas, selectorPaginador, paginaActual, limiteFilas, callbackPagina) {
    const filas = Array.from(document.querySelectorAll(selectorFilas));
    const paginador = document.querySelector(selectorPaginador);
    if (!paginador) return;

    const filasFiltradas = filas.filter(f => f.getAttribute('data-filtro-oculto') !== 'true');
    const totalFilas = filasFiltradas.length;
    const totalPaginas = Math.max(1, Math.ceil(totalFilas / limiteFilas));

    if (paginaActual > totalPaginas) paginaActual = 1;
    callbackPagina(paginaActual);

    const inicio = (paginaActual - 1) * limiteFilas;
    const fin = inicio + limiteFilas;

    filasFiltradas.forEach((fila, idx) => {
        fila.style.display = (idx >= inicio && idx < fin) ? '' : 'none';
    });

    const infoId = selectorPaginador === '#paginadorPrincipal' ? 'infoRegistrosPrincipal' : 'infoRegistrosCatalogo';
    const infoContenedor = document.getElementById(infoId);
    if (infoContenedor) {
        infoContenedor.textContent = totalFilas === 0 ? "Mostrando registros del 0 al 0 de un total de 0 registros" : `Mostrando registros del ${inicio + 1} al ${Math.min(fin, totalFilas)} de un total de ${totalFilas} registros`;
    }

    paginador.innerHTML = '';
    const btnAnt = document.createElement('li');
    btnAnt.className = `page-item-jama ${paginaActual === 1 ? 'disabled' : ''}`;
    btnAnt.innerHTML = `<button class="page-link-jama">ANTERIOR</button>`;
    if (paginaActual > 1) btnAnt.onclick = () => { callbackPagina(paginaActual - 1); sincronizarFiltrosYPaginas(); };
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
    if (paginaActual < totalPaginas) btnSig.onclick = () => { callbackPagina(paginaActual + 1); sincronizarFiltrosYPaginas(); };
    paginador.appendChild(btnSig);
}

function sincronizarFiltrosYPaginas() {
    if (document.getElementById('cuerpoTablaPrincipal')) filtrarTablaPrincipal();
    if (document.getElementById('tablaCatalogo')) filtrarCatalogo();
}

// ─── MANEJADORES DE APERTURA DE MODALES DESDE EL HTML ────────────────
function manejadorModalLote(btn) { abrirModalLote(btn.getAttribute('data-id'), btn.getAttribute('data-nombre'), btn.getAttribute('data-categoria')); }
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

function abrirModalNuevoInsumo() {
    if (modalNuevoInsumoInstance) {
        AppUtils.clearForm('#formNuevoInsumo');
        modalNuevoInsumoInstance.show();
    }
}

function prepararEdicionInsumo(id, nombre, categoria, unidadMedida, stockMinimo) {
    // Carga de datos principales en los inputs
    document.getElementById('editInsumoId').value = id;
    document.getElementById('editInsumoNombre').value = nombre ? nombre.trim() : "";

    // Forzamos que el valor inicial sea entero al renderizarlo en el input de edición
    document.getElementById('editInsumoStockMinimo').value = parseInt(stockMinimo) || 0;

    const selectCategoria = document.getElementById('editarCategoria');
    const selectUnidad = document.getElementById('editInsumoUnidad');

    // Sincronizamos la categoría que viene de la base de datos
    if (selectCategoria && categoria) {
        selectCategoria.value = categoria.toUpperCase().trim();
    }

    // 🌟 REGLA DE NEGOCIO: Aplicamos el filtro de unidades inmediatamente al abrir el modal
    simplificarUnidadesPorProteina(selectCategoria, selectUnidad);

    // Asignamos la unidad de medida original del insumo (si no es proteína, se seleccionará su UND, LT, etc.)
    if (selectUnidad && unidadMedida) {
        selectUnidad.value = unidadMedida;
    }

    const formEditar = document.getElementById('formEditarInsumo') || document.querySelector('#modalEditarInsumo form');
    if (formEditar) {
        const inputMinimoEdit = formEditar.querySelector('input[name="stockMinimo"]') || document.getElementById('editInsumoStockMinimo');
        if (inputMinimoEdit) {
            inputMinimoEdit.min = "0";
            inputMinimoEdit.step = "1"; // Aseguramos que el step en JS también sea 1
            inputMinimoEdit.type = "number";
        }

        formEditar.onsubmit = function (e) {
            const nombreVal = document.getElementById('editInsumoNombre').value.trim();

            // Pasamos a usar Number() para evaluar si tiene decimales reales
            const minimoValRaw = inputMinimoEdit?.value;
            const minimoVal = Number(minimoValRaw);

            // Validaciones de formato del Nombre
            const regexLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/;
            if (!nombreVal || !regexLetras.test(nombreVal)) {
                e.preventDefault();
                AppUtils.showNotification('No se pudo guardar: El nombre del insumo solo puede contener letras.', 'error');
                return false;
            }

            // Validaciones de Stock Mínimo (No Negativos)
            if (isNaN(minimoVal) || minimoVal < 0) {
                e.preventDefault();
                AppUtils.showNotification('No se pudo guardar: El stock mínimo no puede ser un número negativo.', 'error');
                return false;
            }

            // VALIDACIÓN DE ENTEROS: Bloqueo final si metieron decimales de alguna forma
            if (!Number.isInteger(minimoVal) || minimoValRaw.includes('.') || minimoValRaw.includes(',')) {
                e.preventDefault();
                AppUtils.showNotification('No se pudo guardar: El stock mínimo debe ser un número entero (sin decimales).', 'error');
                return false;
            }

            AppUtils.showLoading(true);
            return true;
        };
    }

    if (modalEditarInsumoInstance) {
        modalEditarInsumoInstance.show();
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
            filaMensaje.innerHTML = `<td colspan="${totalColumnas}" class="text-center py-5 text-muted bg-light-jama"><span class="fw-semibold small">No se encontraron insumos</span></td>`;
            contenedor.appendChild(filaMensaje);
        }
    } else if (filaMensaje) {
        filaMensaje.remove();
    }
}

function confirmarEliminacion(id) {
    Swal.fire({
        title: '<span style="color: var(--lajama-green); font-weight: 800;">¿Estás seguro de inactivar este insumo?</span>',
        html: `<div class="text-start small p-2 rounded" style="background-color: var(--lajama-cream); border: 1px dashed rgba(27,58,44,0.15);">
                <p class="mb-2">⚠️ <strong>Impacto en Recetas:</strong> Se desvinculará de las fórmulas de platos.</p>
                <p class="mb-0">📊 <strong>Impacto en Almacén:</strong> Cambiará a estado INACTIVO en producción y pasará al panel de respaldos.</p>
               </div>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, archivar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                AppUtils.showLoading(true);
                const res = await fetch(`/insumos/eliminar/${id}`, { method: 'POST' });
                AppUtils.showLoading(false);

                if (res.ok) {
                    AppUtils.showNotification('Insumo archivado correctamente', 'success');

// 1. MUTACIÓN EN TABLA CATÁLOGO (Pasar a modo Inactivo en caliente)
                    const botonDelete = document.querySelector(`#tablaCatalogo button.btn-action-delete[data-id="${id}"]`);
                    let nombreInsumo = "Insumo", categoriaInsumo = "GENERAL", unidadMedida = "Kg", stockMinimo = "0";
                    let tienePermisoPurga = false;

                    if (botonDelete) {
                        const fila = botonDelete.closest('tr');

                        // 🛡️ Detección híbrida corregida y encapsulada estrictamente dentro del contenedor histórico
                        const esSuperAdminPorInput = (document.getElementById('sessionRolHidden')?.value === 'SUPER_ADMIN');
                        const tablaArchivados = document.getElementById('tablaArchivados');
                        const tieneTachoRojoInstanciado = tablaArchivados ? !!tablaArchivados.querySelector('button.btn-danger, button[onclick*="confirmarPurgaDefinitiva"]') : false;

                        if (esSuperAdminPorInput || tieneTachoRojoInstanciado) {
                            tienePermisoPurga = true;
                        }

                        const celdaNombre = fila.querySelector('td:nth-child(1) span:first-child');
                        celdaNombre.classList.add('text-muted', 'text-decoration-line-through');

                        if (!fila.querySelector('td:nth-child(1) .bg-danger')) {
                            const badgeInactivo = document.createElement('span');
                            badgeInactivo.className = 'badge bg-danger ms-2';
                            badgeInactivo.style.fontSize = '0.65rem';
                            badgeInactivo.textContent = 'INACTIVO';
                            fila.querySelector('td:nth-child(1)').appendChild(badgeInactivo);
                        }

                        nombreInsumo = celdaNombre.textContent.trim();
                        categoriaInsumo = fila.querySelector('td:nth-child(2)')?.textContent.trim() || 'GENERAL';
                        unidadMedida = fila.querySelector('td:nth-child(3)')?.textContent.trim() || 'Kg';
                        stockMinimo = fila.querySelector('td:nth-child(4)')?.textContent.trim() || '0';

                        if (fila.querySelector('.btn-action-edit')) {
                            fila.querySelector('.btn-action-edit').disabled = true;
                        }

                        const wrapper = botonDelete.parentElement;
                        wrapper.innerHTML = `
                            <button type="button" class="btn btn-sm btn-action-status is-active rounded-pill"
                                    data-id="${id}" data-nombre="${nombreInsumo}"
                                    onclick="window.confirmarRestauracion(this.getAttribute('data-id'), this.getAttribute('data-nombre'))"
                                    title="Reactivar Insumo">
                                <i class="bi bi-arrow-counterclockwise"></i>
                            </button>
                        `;
                    }

// 2. MUTACIÓN EN TABLA PORCIONES/PROTEÍNAS (CORREGIDO)
                    const botonesVivos = document.querySelectorAll(`#cuerpoTablaPrincipal button[data-id="${id}"]`);
                    let stockActualStr = "0";

                    botonesVivos.forEach(btn => {
                        const filaP = btn.closest('tr');

                        // Buscamos el texto del nombre del insumo en la primera celda
                        const spanTxt = filaP.querySelector('td:first-child span:first-child');
                        if (spanTxt) {
                            spanTxt.classList.remove('text-dark', 'text-secondary');
                            spanTxt.classList.add('text-muted', 'text-decoration-line-through');
                        }

                        // Inyectamos el badge rojo de INACTIVO al lado del nombre si no existe ya
                        if (!filaP.querySelector('td:first-child .bg-danger')) {
                            const bInactivo = document.createElement('span');
                            bInactivo.className = 'badge bg-danger ms-1';
                            bInactivo.style.fontSize = '0.65rem';
                            bInactivo.textContent = 'INACTIVO';
                            filaP.querySelector('td:first-child').appendChild(bInactivo);
                        }

                        // Capturamos el valor real del stock actual para clonarlo en la vista de archivados
                        const badgeStock = filaP.querySelector('.badge-stock-dinamico') || filaP.querySelector('td:nth-child(2) span:first-child');
                        if (badgeStock) {
                            stockActualStr = badgeStock.textContent.trim();
                        }

                        // Apagamos físicamente todos los botones operativos (Lote, Cocina, Ajuste) excepto el historial del Kardex
                        filaP.querySelectorAll('button:not([onclick*="manejadorModalKardex"])').forEach(b => {
                            b.disabled = true;
                        });
                    });

                    // 3. INYECTAR EN LA PESTAÑA DE ARCHIVADOS AUTOMÁTICAMENTE
                    const tablaArchivadosCuerpo = document.querySelector('#tablaArchivados tbody');
                    if (tablaArchivadosCuerpo) {
                        let botoneraRespaldo = `
                            <button type="button" class="btn btn-sm btn-action-status is-active border rounded-pill px-3"
                                    data-id="${id}" data-nombre="${nombreInsumo}"
                                    onclick="window.confirmarRestauracion(this.getAttribute('data-id'), this.getAttribute('data-nombre'))"><i class="bi bi-arrow-counterclockwise me-1"></i> Restaurar</button>
                        `;

                        // 💣 Inyecta la purga asíncronamente en el acto si se verificó el rol superior
                        if (tienePermisoPurga) {
                            botoneraRespaldo += `
                                <button type="button" class="btn btn-sm btn-danger rounded-pill px-3 ms-2"
                                        data-id="${id}" data-nombre="${nombreInsumo}"
                                        onclick="window.confirmarPurgaDefinitiva(this.getAttribute('data-id'), this.getAttribute('data-nombre'))" style="font-size: 0.75rem; font-weight: bold;"><i class="bi bi-trash3-fill me-1"></i> Purgar</button>
                            `;
                        }

                        const nuevaFilaArchivos = document.createElement('tr');
                        nuevaFilaArchivos.setAttribute('data-archivado-id', id);
                        nuevaFilaArchivos.className = 'animate__animated animate__fadeIn';
                        nuevaFilaArchivos.innerHTML = `
                            <td class="ps-4 fw-semibold text-muted text-decoration-line-through">${nombreInsumo}</td>
                            <td><span class="badge bg-light text-secondary border px-2 py-1 rounded-pill small">${categoriaInsumo}</span></td>
                            <td class="fw-bold text-secondary">${stockActualStr}</td>
                            <td class="text-muted">${unidadMedida}</td>
                            <td class="text-center pe-4" style="width: 1%; white-space: nowrap;"><div class="d-flex align-items-center justify-content-center">${botoneraRespaldo}</div></td>
                        `;
                        const fNoRes = tablaArchivadosCuerpo.querySelector('.fila-no-results');
                        if (fNoRes) fNoRes.remove();

                        tablaArchivadosCuerpo.appendChild(nuevaFilaArchivos);
                    }

                    setTimeout(() => {
                        sincronizarFiltrosYPaginas();
                        if (typeof window.filtrarTablaArchivados === "function") window.filtrarTablaArchivados();
                    }, 100);

                } else {
                    AppUtils.showNotification('No se pudo procesar el archivado', 'error');
                }
            } catch (error) {
                AppUtils.showLoading(false);
                AppUtils.showNotification('Error de conexión', 'error');
            }
        }
    });
}

function cambiarPestañaAsincrona(pestañaDestino) {
    document.getElementById('pane-proteinas')?.classList.add('d-none');
    document.getElementById('pane-catalogo')?.classList.add('d-none');
    document.getElementById('pane-recetas')?.classList.add('d-none');
    document.getElementById('pane-crear-receta')?.classList.add('d-none');
    document.getElementById('pane-archivados')?.classList.add('d-none');

    if (pestañaDestino === 'proteinas') { document.getElementById('pane-proteinas')?.classList.remove('d-none'); document.getElementById('radio-btn-proteinas').checked = true; }
    else if (pestañaDestino === 'catalogo') { document.getElementById('pane-catalogo')?.classList.remove('d-none'); document.getElementById('radio-btn-catalogo').checked = true; }
    else if (pestañaDestino === 'recetas') { document.getElementById('pane-recetas')?.classList.remove('d-none'); document.getElementById('radio-btn-recetas').checked = true; }
    else if (pestañaDestino === 'crear-receta') { document.getElementById('pane-crear-receta')?.classList.remove('d-none'); document.getElementById('radio-btn-crear-receta').checked = true; }
    else if (pestañaDestino === 'archivados') {
        document.getElementById('pane-archivados')?.classList.remove('d-none');
        document.getElementById('radio-btn-archivados').checked = true;
        if (typeof window.filtrarTablaArchivados === "function") window.filtrarTablaArchivados();
    }
    sincronizarFiltrosYPaginas();
}

function actualizarSemaforoVisualStock(celdaStock, nuevoStock, esProteina) {
    if (!celdaStock) return;
    const stockMinimo = parseFloat(celdaStock.getAttribute('data-minimo')) || 0;
    if (nuevoStock <= stockMinimo) {
        if (esProteina) { celdaStock.classList.remove('bg-success'); celdaStock.classList.add('bg-danger'); }
        else { celdaStock.classList.remove('text-dark'); celdaStock.classList.add('text-danger'); }
    } else {
        if (esProteina) { celdaStock.classList.remove('bg-danger'); celdaStock.classList.add('bg-success'); }
        else { celdaStock.classList.remove('text-danger'); celdaStock.classList.add('text-dark'); }
    }
}

const UNIDADES_RESPALDO = [
    { value: "KG", text: "Kilogramos (KG)" },
    { value: "UND", text: "Unidades (UND)" },
    { value: "LT", text: "Litros (LT)" }
];

// 🥩 2. FUNCIÓN ULTRA SIMPLIFICADA PARA FILTRAR PROTEÍNAS
function simplificarUnidadesPorProteina(selectCategoria, selectUnidad) {
    if (!selectCategoria || !selectUnidad) return;

    const categoria = selectCategoria.value.toUpperCase().trim();

    // Limpiamos el combo de unidades por completo
    selectUnidad.innerHTML = "";

    if (categoria === "PROTEÍNAS" || categoria === "PROTEINAS") {
        // Si es Proteínas, solo creamos e insertamos la opción única de KG
        const opt = document.createElement("option");
        opt.value = "KG";
        opt.text = "Kilogramos (KG)";
        selectUnidad.appendChild(opt);
    } else {
        // Si es cualquier otra categoría, restauramos todas las unidades del respaldo
        UNIDADES_RESPALDO.forEach(unidad => {
            const opt = document.createElement("option");
            opt.value = unidad.value;
            opt.text = unidad.text;
            selectUnidad.appendChild(opt);
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Para el formulario de Registrar Nuevo
    const catNueva = document.getElementById("nuevoInsumoCategoria") || document.querySelector('#formNuevoInsumo select[name="categoria"]');
    const uniNueva = document.getElementById("nuevoInsumoUnidad") || document.querySelector('#formNuevoInsumo select[name="unidadMedida"]');

    if (catNueva && uniNueva) {
        catNueva.addEventListener("change", () => simplificarUnidadesPorProteina(catNueva, uniNueva));
    }

    // Para el formulario de Editar (Cuando el usuario cambie el select manualmente estando el modal abierto)
    const catEditar = document.getElementById("editarCategoria");
    const uniEditar = document.getElementById("editInsumoUnidad");

    if (catEditar && uniEditar) {
        catEditar.addEventListener("change", () => simplificarUnidadesPorProteina(catEditar, uniEditar));
    }
});

// ─── EXPORTACIÓN GLOBAL DE MANEJADORES PARA EL HTML (LA JAMA 2026) ───
window.manejadorModalLote        = manejadorModalLote;
window.manejadorModalProduccion  = manejadorModalProduccion;
window.manejadorModalAjuste      = manejadorModalAjuste;
window.manejadorModalKardex      = manejadorModalKardex;
window.manejadorModalEditar      = manejadorModalEditar;
window.manejadorModalNuevoInsumo = abrirModalNuevoInsumo;
window.confirmarEliminacion      = confirmarEliminacion;