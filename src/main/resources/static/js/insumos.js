/**
 * LA JAMA - Sistema de Gestión de Inventario y Recetas (Módulo Unificado)
 * Control unificado de Insumos Generales y Proteínas Controladas.
 */

// ─── INSTANCIAS GLOBALES DE MODALES DE BOOTSTRAP ─────────────────
let modalNuevoInsumoInstance = null;
let modalEditarInsumoInstance = null;
let modalDetalleRecetaInstance = null;
let modalLoteInstance = null;
let modalProduccionInstance = null;
let modalAjusteInstance = null;
let modalKardexPorcionesInstance = null;

// Datos en caché para el filtrado dinámico del Kardex sin peticiones redundantes
let kardexData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Inicialización segura de todos los modales operativos
    const nuevoInsumoEl = document.getElementById('modalNuevoInsumo');
    if (nuevoInsumoEl) modalNuevoInsumoInstance = new bootstrap.Modal(nuevoInsumoEl);

    const editarInsumoEl = document.getElementById('modalEditarInsumo');
    if (editarInsumoEl) modalEditarInsumoInstance = new bootstrap.Modal(editarInsumoEl);

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

    // Control de restricciones lógicas para la creación de nuevos insumos
    const selectCategoria = document.getElementById('selectCategoria');
    const selectUnidad = document.getElementById('selectUnidad');

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

    // Validación intermedia al armar recetas
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

    // Delegación de eventos para la visualización ágil de recetarios activos
    document.body.addEventListener('click', function (e) {
        if (e.target.closest('.btn-ver-receta')) {
            const btn = e.target.closest('.btn-ver-receta');
            cargarDetalleReceta(btn.dataset.id, btn.dataset.nombre);
        }
    });
});

// ─── CONTROL DE INSUMOS GENERALES (GESTIÓN EXCLUSIVA EN MODAL) ───

function abrirModalNuevoInsumo() {
    if (modalNuevoInsumoInstance) {
        AppUtils.clearForm('#formNuevoInsumo');
        modalNuevoInsumoInstance.show();
    }
}

/**
 * Prepara y despliega el nuevo modal estructurado cargando la información limpia desde los argumentos
 * de la fila de la tabla optimizada sin sobrecargar el DOM con inputs ocultos.
 */
function prepararEdicionInsumo(id, nombre, categoria, unidadMedida, stockActual, stockMinimo) {
    document.getElementById('editInsumoId').value = id;
    document.getElementById('editInsumoNombre').value = nombre;
    document.getElementById('editInsumoCategoria').value = categoria;
    document.getElementById('editInsumoUnidad').value = unidadMedida;
    document.getElementById('editInsumoStockActual').value = stockActual;
    document.getElementById('editInsumoStockMinimo').value = stockMinimo;

    if (modalEditarInsumoInstance) {
        modalEditarInsumoInstance.show();
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

// ─── CONTROL DE RECETARIOS ───────────────────────────────────────

function actualizarAccion(idProducto) {
    if (idProducto) {
        document.getElementById('formAsignar').action = '/insumos/producto/' + idProducto + '/agregar';
    }
}

async function cargarDetalleReceta(idProducto, nombreProducto) {
    document.getElementById('tituloModalReceta').innerHTML = `<i class="bi bi-journal-text me-2"></i>Receta: ${nombreProducto}`;
    const cuerpo = document.getElementById('cuerpoDetalleReceta');
    cuerpo.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><br>Cargando...</td></tr>';

    if (modalDetalleRecetaInstance) modalDetalleRecetaInstance.show();

    try {
        const response = await fetch(`/insumos/producto/${idProducto}`);
        const datos = await response.json();
        if (datos.length === 0) {
            cuerpo.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No hay insumos asignados a este plato.</td></tr>';
            return;
        }
        cuerpo.innerHTML = datos.map(item => `
            <tr>
                <td class="ps-3 fw-semibold text-dark">${item.nombreInsumo}</td>
                <td class="text-muted">${item.unidadMedida}</td>
                <td class="text-end fw-bold">${item.cantidadUsada.toFixed(3)}</td>
                <td class="text-center pe-3">
                    <form action="/insumos/producto/receta/eliminar/${item.id}" method="post" class="m-0" onsubmit="confirmarQuitarInsumo(event, ${item.id})">
                        <button type="submit" class="btn btn-sm text-danger p-1" title="Quitar de la receta">
                            <i class="bi bi-x-circle-fill fs-5"></i>
                        </button>
                    </form>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        cuerpo.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Error al cargar la receta.</td></tr>';
    }
}

function confirmarQuitarInsumo(event, id) {
    event.preventDefault();
    const form = event.target;
    AppUtils.showConfirmationDialog({
        title: '¿Quitar de la receta?',
        text: 'El insumo dejará de descontarse al preparar este plato.',
        icon: 'warning',
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Quitar'
    }, function () {
        AppUtils.showLoading(true);
        form.submit();
    });
}

// ─── CONTROL DE PROTEÍNAS: LOTES ─────────────────────────────────

function abrirModalLote(idInsumo, nombre) {
    document.getElementById('loteIdInsumo').value = idInsumo;
    document.getElementById('loteNombreInsumo').innerText = nombre;
    document.getElementById('loteKg').value = '';
    document.getElementById('lotePorcionesPorKg').value = '';
    document.getElementById('loteCosto').value = '';
    document.getElementById('loteObservacion').value = '';

    if (modalLoteInstance) modalLoteInstance.show();
}

async function guardarLote() {
    const idInsumo          = document.getElementById('loteIdInsumo').value;
    const kgComprados       = document.getElementById('loteKg').value;
    const porcionesPorKg    = document.getElementById('lotePorcionesPorKg').value;
    const costoTotal        = document.getElementById('loteCosto').value;
    const observacion       = document.getElementById('loteObservacion').value;

    if (!kgComprados || parseFloat(kgComprados) <= 0) {
        AppUtils.showNotification('Ingresa los kg comprados', 'error');
        return;
    }
    if (!porcionesPorKg || parseFloat(porcionesPorKg) <= 0) {
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
                idInsumo: parseInt(idInsumo),
                kgComprados: parseFloat(kgComprados),
                porcionesPorKg: parseFloat(porcionesPorKg),
                costoTotal: parseFloat(costoTotal),
                observacion: observacion || null
            })
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            modalLoteInstance.hide();
            AppUtils.showNotification('Lote registrado correctamente', 'success');

            // Mejoramos la actualización
            await new Promise(resolve => setTimeout(resolve, 600)); // pequeño delay
            location.reload();   // por ahora mantenemos reload (es más simple y seguro)

        } else {
            AppUtils.showNotification('Error al registrar el lote', 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión', 'error');
    }
}

// ─── CONTROL DE PROTEÍNAS: PRODUCCIÓN EN COCINA ──────────────────

async function abrirModalProduccion(idInsumo, nombre) {
    document.getElementById('prodIdInsumo').value = idInsumo;
    document.getElementById('prodNombreInsumo').innerText = nombre;

    document.getElementById('prodKg').value = '';
    document.getElementById('prodObtenidas').value = '';
    document.getElementById('prodObservacion').value = '';
    document.getElementById('resumenMerma').classList.add('d-none');

    const selectLote = document.getElementById('prodSelectLote');
    selectLote.innerHTML = '<option value="">Cargando lotes...</option>';

    if (modalProduccionInstance) modalProduccionInstance.show();

    try {
        const res = await fetch(`/proteinas/lotes/${idInsumo}`);
        const lotes = await res.json();

        const lotesVigentes = lotes.filter(l => (l.saldoKg !== null && l.saldoKg !== undefined ? l.saldoKg : l.kgComprados) > 0);

        if (lotesVigentes.length === 0) {
            selectLote.innerHTML = '<option value="">Sin lotes con saldo disponible</option>';
            document.getElementById('prodKg').disabled = true;
            return;
        }

        document.getElementById('prodKg').disabled = false;

        selectLote.innerHTML = lotesVigentes.map(l => {
            // Leemos las propiedades mapeadas por Spring Boot
            const saldo = l.saldoKg !== undefined && l.saldoKg !== null ? l.saldoKg : l.kgComprados;
            const porciones = l.porcionesPorKg !== undefined && l.porcionesPorKg !== null ? l.porcionesPorKg : 0;

            return `
                <option value="${l.id}"
                        data-kg="${saldo}"
                        data-porciones="${porciones}">
                    ${new Date(l.fechaCompra).toLocaleDateString('es-PE')} — Quedan: ${saldo.toFixed(2)} kg (de ${l.kgComprados} kg) — ${porciones} porc/kg
                </option>
            `;
        }).join('');

        if (lotesVigentes.length > 0) {
            selectLote.value = lotesVigentes[0].id;
            actualizarPorcionesEsperadas();
        }

    } catch (e) {
        console.error(e);
        selectLote.innerHTML = '<option value="">Error al cargar lotes</option>';
    }
}

function actualizarPorcionesEsperadas() {
    const selectLote = document.getElementById('prodSelectLote');
    const selectedOption = selectLote.options[selectLote.selectedIndex];
    const inputKg = document.getElementById('prodKg');

    if (selectedOption && selectedOption.dataset.kg) {
        const maxSaldo = parseFloat(selectedOption.dataset.kg);

        // 🔥 CONTROL NATIVO FRONTEND: Limitamos dinámicamente el input de kilos
        inputKg.max = maxSaldo;
        inputKg.placeholder = `Máx: ${maxSaldo.toFixed(2)} kg`;

        // Si el usuario ya digitó un número mayor al cambiar de lote, lo corregimos
        if (parseFloat(inputKg.value) > maxSaldo) {
            inputKg.value = maxSaldo;
            AppUtils.showNotification(`Se ajustó la cantidad al máximo disponible (${maxSaldo.toFixed(2)} kg)`, 'warning');
            calcularMerma();
        }
    }
}

// Actualizar el event listener del select
// Agrega esto dentro de tu DOMContentLoaded o después de definir las funciones:
document.addEventListener('DOMContentLoaded', () => {
    const selectLote = document.getElementById('prodSelectLote');
    if (selectLote) {
        selectLote.addEventListener('change', actualizarPorcionesEsperadas);
    }
});

function calcularMerma() {
    const kgProcesados = parseFloat(document.getElementById('prodKg').value) || 0;
    const porcionesObtenidas = parseInt(document.getElementById('prodObtenidas').value) || 0;

    const selectLote = document.getElementById('prodSelectLote');
    const selectedOption = selectLote.options[selectLote.selectedIndex];
    const porcionesEsperadasPorKg = selectedOption ? parseFloat(selectedOption.dataset.porciones) || 0 : 0;

    const resumen = document.getElementById('resumenMerma');

    if (kgProcesados <= 0 || porcionesObtenidas <= 0 || porcionesEsperadasPorKg <= 0) {
        resumen.classList.add('d-none');
        return;
    }

    const porcionesEsperadas = Math.round(kgProcesados * porcionesEsperadasPorKg);
    const diferencia = porcionesObtenidas - porcionesEsperadas;
    const mermaKg = Math.abs(diferencia) / porcionesEsperadasPorKg;

    let html = `
        <div class="d-flex justify-content-between">
            <span>Porciones esperadas:</span>
            <strong>${porcionesEsperadas}</strong>
        </div>
        <div class="d-flex justify-content-between">
            <span>Diferencia:</span>
            <strong class="${diferencia >= 0 ? 'text-success' : 'text-danger'}">
                ${diferencia >= 0 ? '+' : ''}${diferencia} porciones
            </strong>
        </div>
        <div class="d-flex justify-content-between">
            <span>Merma estimada:</span>
            <strong>${mermaKg.toFixed(3)} kg</strong>
        </div>
    `;

    resumen.innerHTML = html;
    resumen.classList.remove('d-none');
    resumen.className = `alert rounded-3 small p-3 ${diferencia < 0 ? 'alert-danger' : 'alert-warning'}`;
}

async function guardarProduccion() {
    const idInsumo     = document.getElementById('prodIdInsumo').value;
    const idLote       = document.getElementById('prodSelectLote').value;
    const kgProcesados = document.getElementById('prodKg').value;
    const porcionesObtenidas = document.getElementById('prodObtenidas').value;
    const observacion  = document.getElementById('prodObservacion').value;

    // Validaciones robustas
    if (!idInsumo) {
        AppUtils.showNotification('Error: No se identificó el insumo', 'error');
        return;
    }
    if (!idLote) {
        AppUtils.showNotification('Debes seleccionar un lote', 'error');
        return;
    }
    if (!kgProcesados || parseFloat(kgProcesados) <= 0) {
        AppUtils.showNotification('Ingresa los kg procesados', 'error');
        return;
    }
    if (!porcionesObtenidas || parseInt(porcionesObtenidas) <= 0) {
        AppUtils.showNotification('Ingresa las porciones obtenidas', 'error');
        return;
    }

    const maxPermitido = parseFloat(document.getElementById('prodKg').max);
        if (parseFloat(kgProcesados) > maxPermitido) {
            AppUtils.showNotification(`No puedes procesar más del saldo disponible del lote (${maxPermitido.toFixed(2)} kg)`, 'error');
            return;
        }

    AppUtils.showLoading(true);

    try {
        const res = await fetch('/proteinas/produccion/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idLote: parseInt(idLote),
                kgProcesados: parseFloat(kgProcesados),
                porcionesObtenidas: parseInt(porcionesObtenidas),
                observacion: observacion || null
            })
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            if (modalProduccionInstance) modalProduccionInstance.hide();
            AppUtils.showNotification('Producción registrada correctamente', 'success');
            setTimeout(() => location.reload(), 900);
        } else {
            const errorText = await res.text();
            AppUtils.showNotification('Error: ' + (errorText || 'No se pudo registrar'), 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        console.error(e);
        AppUtils.showNotification('Error de conexión con el servidor', 'error');
    }
}

// ─── CONTROL DE PROTEÍNAS: AJUSTES DIRECTOS ──────────────────────

function abrirModalAjuste(idInsumo, nombre) {
    document.getElementById('ajusteIdInsumo').value = idInsumo;
    document.getElementById('ajusteNombreInsumo').innerText = nombre;
    document.getElementById('ajusteTipo').value = '';
    document.getElementById('ajusteCantidad').value = '';
    document.getElementById('ajusteMotivo').value = '';

    document.getElementById('btnIngreso').className = 'btn btn-outline-success flex-fill rounded-3 fw-bold';
    document.getElementById('btnEgreso').className = 'btn btn-outline-danger flex-fill rounded-3 fw-bold';

    if (modalAjusteInstance) modalAjusteInstance.show();
}

function seleccionarTipoAjuste(tipo) {
    document.getElementById('ajusteTipo').value = tipo;
    const btnIngreso = document.getElementById('btnIngreso');
    const btnEgreso = document.getElementById('btnEgreso');

    if (tipo === 'INGRESO') {
        btnIngreso.className = 'btn btn-success flex-fill rounded-3 fw-bold';
        btnEgreso.className = 'btn btn-outline-danger flex-fill rounded-3 fw-bold';
    } else {
        btnEgreso.className = 'btn btn-danger flex-fill rounded-3 fw-bold';
        btnIngreso.className = 'btn btn-outline-success flex-fill rounded-3 fw-bold';
    }
}

async function guardarAjuste() {
    const idInsumo = document.getElementById('ajusteIdInsumo').value;
    const tipo     = document.getElementById('ajusteTipo').value;
    const cantidad = document.getElementById('ajusteCantidad').value;
    const motivo   = document.getElementById('ajusteMotivo').value;

    if (!tipo) {
        AppUtils.showNotification('Selecciona Ingreso o Egreso', 'error');
        return;
    }
    if (!cantidad || parseInt(cantidad) <= 0) {
        AppUtils.showNotification('Ingresa una cantidad válida', 'error');
        return;
    }
    if (!motivo.trim()) {
        AppUtils.showNotification('Ingresa el motivo del ajuste', 'error');
        return;
    }

    AppUtils.showLoading(true);
    try {
        const params = new URLSearchParams({ idInsumo, cantidad, tipo, motivo });
        const res = await fetch('/proteinas/movimientos/ajustar?' + params.toString(), {
            method: 'POST'
        });
        AppUtils.showLoading(false);
        if (res.ok) {
            if (modalAjusteInstance) modalAjusteInstance.hide();
            AppUtils.showNotification('Ajuste de porciones registrado', 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            const err = await res.text();
            AppUtils.showNotification('Error: ' + err, 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión', 'error');
    }
}

// ─── CONTROL DE PROTEÍNAS: REGISTRO HISTÓRICO (KARDEX) ───────────

async function abrirKardexPorciones(id, nombre) {
    document.getElementById('tituloKardexPorciones').innerHTML = `<i class="bi bi-clock-history me-2"></i>Kardex por Porciones: ${nombre}`;
    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    cuerpo.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Buscando historial...</td></tr>';

    // Corrección de la lógica de Clases de Filtrado: Sincroniza dinámicamente con los botones reales
    document.querySelectorAll('.btn-filtro').forEach(btn => btn.classList.remove('active'));
    const btnTodos = document.querySelector('.btn-filtro[data-filtro="TODOS"]');
    if (btnTodos) btnTodos.classList.add('active');

    if (modalKardexPorcionesInstance) modalKardexPorcionesInstance.show();

    try {
        const res = await fetch(`/proteinas/kardex/${id}`);
        kardexData = await res.json();
        renderKardex(kardexData);
    } catch (e) {
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-3">Error crítico al cargar el historial.</td></tr>';
    }
}

/**
 * Filtra el set de datos en caché local del Kardex y maneja las clases activas en la UI de forma fluida.
 */
function filtrarKardex(filtro) {
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.classList.remove('active');
    });

    const btnActivo = document.querySelector(`.btn-filtro[data-filtro="${filtro}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    const datosFiltrados = filtro === 'TODOS' ? kardexData : kardexData.filter(m => m.origen === filtro);
    renderKardex(datosFiltrados);
}

function renderKardex(datos) {
    const cuerpo = document.getElementById('cuerpoKardexPorciones');

    if (!datos || datos.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Sin registros de movimientos en este filtro.</td></tr>';
        return;
    }

    cuerpo.innerHTML = datos.map(m => {
        const badge = badgeOrigen(m.origen);
        const stockCell = m.stockResultante != null ? m.stockResultante + ' porc.' : '<span class="text-muted">—</span>';
        const cantCell = `<span class="fw-bold ${m.signo === '+' ? 'text-success' : m.signo === '-' ? 'text-danger' : ''}">${m.signo} ${m.amount || m.cantidad}</span>`;

        return `
            <tr>
                <td class="ps-3 text-muted small">${new Date(m.fecha).toLocaleString('es-PE')}</td>
                <td>${badge}</td>
                <td class="text-dark fw-medium small">${m.detalle}</td>
                <td class="text-end font-monospace">${cantCell}</td>
                <td class="text-end pe-3 text-muted font-monospace small">${stockCell}</td>
            </tr>
        `;
    }).join('');
}

function badgeOrigen(origen) {
    const map = {
        'LOTE':       '<span class="badge bg-light-success text-success border px-2 py-1 rounded-pill small fw-bold">🛒 Lote</span>',
        'PRODUCCION': '<span class="badge bg-light-warning text-warning-dark border px-2 py-1 rounded-pill small fw-bold">🔥 Producción</span>',
        'AJUSTE':     '<span class="badge bg-light-secondary text-secondary border px-2 py-1 rounded-pill small fw-bold">⚙️ Ajuste</span>',
        'VENTA':      '<span class="badge bg-light-danger text-danger border px-2 py-1 rounded-pill small fw-bold">📦 Venta</span>'
    };
    return map[origen] ?? `<span class="badge bg-light border px-2 py-1 rounded-pill small text-dark">${origen}</span>`;
}

function safeGetValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
}