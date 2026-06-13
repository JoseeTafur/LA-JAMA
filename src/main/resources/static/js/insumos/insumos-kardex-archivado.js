/**
 * LA JAMA — insumos-kardex-archivado.js
 * Gestión asíncrona, paginación y purga del cementerio de datos (Insumos Estado 0).
 */

let paginaActualArchivados = 1;
let limiteFilasArchivados  = 10;

document.addEventListener('DOMContentLoaded', () => {
    window.inicializarPaginacionArchivados();
    const buscadorArchivados = document.getElementById('buscadorArchivados');
    if (buscadorArchivados) {
        buscadorArchivados.addEventListener('keyup', window.filtrarTablaArchivados);
    }
});

window.inicializarPaginacionArchivados = function() {
    if (document.getElementById('tablaArchivados')) {
        ejecutarPaginacionTabla('#tablaArchivados tbody tr:not(.fila-no-results)', '#paginadorArchivados', paginaActualArchivados, limiteFilasArchivados, (p) => { paginaActualArchivados = p; });
    }
};

window.filtrarTablaArchivados = function() {
    const buscador = document.getElementById('buscadorArchivados');
    if (!buscador) return;
    const textoBuscado = buscador.value.toLowerCase().trim();
    const filas = document.querySelectorAll('#tablaArchivados tbody tr:not(.fila-no-results)');
    let contadorVisibles = 0;

    filas.forEach(fila => {
        const celdaNombre = fila.querySelector('td:first-child');
        const celdaCategoria = fila.querySelector('td:nth-child(2)');
        if (celdaNombre) {
            const match = celdaNombre.textContent.toLowerCase().includes(textoBuscado) || (celdaCategoria && celdaCategoria.textContent.toLowerCase().includes(textoBuscado));
            if (match) {
                fila.removeAttribute('data-filtro-oculto');
                contadorVisibles++;
            } else {
                fila.setAttribute('data-filtro-oculto', 'true');
                fila.style.display = 'none';
            }
        }
    });
    manejadorMensajeNoResultados('#tablaArchivados tbody', contadorVisibles, 5);
    ejecutarPaginacionTabla('#tablaArchivados tbody tr:not(.fila-no-results)', '#paginadorArchivados', paginaActualArchivados, limiteFilasArchivados, (p) => { paginaActualArchivados = p; });
};

window.cambiarLimiteFilasArchivados = function() {
    const selector = document.getElementById('registrosPorPaginaArchivados');
    if (selector) {
        limiteFilasArchivados = parseInt(selector.value);
        paginaActualArchivados = 1;
        window.filtrarTablaArchivados();
    }
};

// 🟢 RESTAURACIÓN ASÍNCRONA MAESTRA (CORREGIDA CON ESCUDO CSRF)
window.confirmarRestauracion = function(id, nombre) {
    Swal.fire({
        title: `<span style="color: var(--lajama-green); font-weight: 800;">¿Restaurar insumo?</span>`,
        text: `El insumo "${nombre}" volverá a estar activo en el catálogo y porciones de proteínas de forma inmediata.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1B3A2C',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, restaurar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                AppUtils.showLoading(true);

                // 🛡️ Capturamos los tokens CSRF estándar de Spring Security si están presentes en la vista
                const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
                const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');

                const headersConfig = {};
                if (token && header) {
                    headersConfig[header] = token;
                }

                // Ejecutamos la petición al backend
                const res = await fetch(`/insumos/reactivar/${id}`, {
                    method: 'POST',
                    headers: headersConfig
                });

                AppUtils.showLoading(false);

                if (res.ok) {
                    AppUtils.showNotification('Insumo restaurado con éxito.', 'success');

                    // 1. Quitar la fila de la pestaña de archivados con animación suave
                    const botonRestaurar = document.querySelector(`#tablaArchivados button[data-id="${id}"]`)
                                        || document.querySelector(`tr[data-archivado-id="${id}"] button`);
                    const filaArchivado = botonRestaurar ? botonRestaurar.closest('tr') : null;
                    if (filaArchivado) {
                        filaArchivado.classList.add('animate__animated', 'animate__fadeOutLeft');
                        setTimeout(() => {
                            filaArchivado.remove();
                            window.filtrarTablaArchivados();
                        }, 400);
                    }

                    // 2. REVIVIR EN LA TABLA CATÁLOGO EN CALIENTE
                    const botonesCatalogo = document.querySelectorAll(`#tablaCatalogo button[data-id="${id}"], #tablaCatalogo tr button[data-id="${id}"]`);
                    botonesCatalogo.forEach(btn => {
                        const filaC = btn.closest('tr');
                        const spanNombre = filaC.querySelector('td:nth-child(1) span:first-child');
                        if (spanNombre) spanNombre.className = 'fw-semibold text-dark';

                        const badgeInactivo = filaC.querySelector('td:nth-child(1) .bg-danger');
                        if (badgeInactivo) badgeInactivo.remove();

                        // Devolver botones originales a su estado vivo
                        if (filaC.querySelector('.btn-action-edit')) {
                            filaC.querySelector('.btn-action-edit').disabled = false;
                        }

                        const wrapperAcciones = filaC.querySelector('.action-buttons-wrapper') || filaC.querySelector('td:last-child div');
                        if (wrapperAcciones) {
                            const catText = filaC.querySelector('td:nth-child(2)')?.textContent.trim() || 'GENERAL';
                            const undText = filaC.querySelector('td:nth-child(3)')?.textContent.trim() || 'Kg';
                            const minText = filaC.querySelector('td:nth-child(4)')?.textContent.trim() || '0';

                            wrapperAcciones.innerHTML = `
                                <button type="button" class="action-jama-btn btn-action-edit"
                                        data-id="${id}" data-nombre="${nombre}" data-categoria="${catText}"
                                        data-unidad="${undText}" data-minimo="${minText}"
                                        onclick="window.manejadorModalEditar(this)">
                                    <svg class="pencil-body" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                </button>
                                <button type="button" class="action-jama-btn btn-action-delete" data-id="${id}" onclick="window.confirmarEliminacion(this.getAttribute('data-id'))">
                                    <svg class="bin-bottom" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                                </button>
                            `;
                        }
                    });

                    // 3. REVIVIR EN LA TABLA DE PORCIONES/PROTEÍNAS EN CALIENTE
                    const botonesPorciones = document.querySelectorAll(`#cuerpoTablaPrincipal button[data-id="${id}"]`);
                    botonesPorciones.forEach(btn => {
                        const filaP = btn.closest('tr');
                        const spanNombreP = filaP.querySelector('td:first-child span:first-child');
                        if (spanNombreP) {
                            spanNombreP.classList.remove('text-muted', 'text-decoration-line-through');
                            const esProteina = filaP.querySelector('.bg-warning') != null;
                            spanNombreP.classList.add(esProteina ? 'text-dark' : 'text-secondary');
                        }

                        const badgeInactivoP = filaP.querySelector('td:first-child .bg-danger');
                        if (badgeInactivoP) badgeInactivoP.remove();

                        // Volver a encender todos los botones operativos de la fila
                        filaP.querySelectorAll('button').forEach(b => b.disabled = false);
                    });

                    setTimeout(() => {
                        if (typeof sincronizarFiltrosYPaginas === "function") sincronizarFiltrosYPaginas();
                    }, 450);

                } else {
                    const txtError = await res.text();
                    AppUtils.showNotification('Error al restaurar: ' + (txtError || 'Respuesta inválida del servidor'), 'error');
                }
            } catch (error) {
                AppUtils.showLoading(false);
                console.error("Error atrapado en restauración:", error);
                AppUtils.showNotification('Fallo de conexión con el servidor o bloqueo de seguridad.', 'error');
            }
        }
    });
};

// 🔴 PURGA FÍSICA PERMANENTE ASÍNCRONA REAL (100% SIN F5)
window.confirmarPurgaDefinitiva = function(id, nombre) {
    Swal.fire({
        title: `<span style="color: #dc3545; font-weight: 800;">⚠️ ALERTA DE PURGA DEFINITIVA</span>`,
        html: `<div class="text-start small p-2 rounded" style="background-color: #fdf2f2; border: 1px dashed rgba(220,53,69,0.2); color: #7a1c1c;">
                <p class="mb-2"><strong>¡Atención SUPER_ADMIN!</strong> Estás a punto de eliminar físicamente a <strong>${nombre}</strong>.</p>
                <p class="mb-2">💥 Se romperán todas las fórmulas de recetas donde este insumo estuvo asignado de forma irreversible.</p>
                <p class="mb-0">🛑 Esta acción no se puede deshacer. Se borrará permanentemente de la base de datos.</p>
               </div>`,
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, PURGAR PERMANENTEMENTE',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                AppUtils.showLoading(true);
                const res = await fetch(`/insumos/purgar/${id}`, { method: 'POST' });
                const data = await res.json();
                AppUtils.showLoading(false);

                if (res.ok && data.success) {
                    AppUtils.showNotification(data.message, 'success');

                    // Al ser purga definitiva, ahora sí removemos las filas por completo del DOM
                    const botonPurga = document.querySelector(`#tablaArchivados button.btn-danger[data-id="${id}"]`) || document.querySelector(`tr[data-archivado-id="${id}"] button.btn-danger`);
                    const fila = botonPurga ? botonPurga.closest('tr') : null;
                    if (fila) {
                        fila.classList.add('animate__animated', 'animate__fadeOutLeft');
                        setTimeout(() => { fila.remove(); window.filtrarTablaArchivados(); }, 400);
                    }

                    const bDelete = document.querySelector(`#tablaCatalogo tr button[onclick*="${id}"]`) || document.querySelector(`#tablaCatalogo tr button[data-id="${id}"]`);
                    if (bDelete) {
                        const fCat = bDelete.closest('tr');
                        fCat.remove();
                    }

                    const bPorc = document.querySelector(`#cuerpoTablaPrincipal button[data-id="${id}"]`);
                    if (bPorc) {
                        const fPorc = bPorc.closest('tr');
                        fPorc.remove();
                    }

                    setTimeout(() => { sincronizarFiltrosYPaginas(); }, 450);
                } else {
                    AppUtils.showNotification(data.message || 'Error en la purga.', 'error');
                }
            } catch (error) {
                AppUtils.showLoading(false);
                AppUtils.showNotification('Fallo crítico de comunicación con el servidor.', 'error');
            }
        }
    });
};