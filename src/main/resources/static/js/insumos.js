/**
 * LA JAMA - Sistema de Gestión de Inventario y Recetas (Módulo Unificado)
 * Control unificado de Insumos Generales y Proteínas Controladas con Paginación de Bloques.
 */

// ─── INSTANCIAS GLOBALES DE MODALES DE BOOTSTRAP ─────────────────
let modalNuevoInsumoInstance = null;
let modalEditarInsumoInstance = null;
let modalDetalleRecetaInstance = null;
let modalLoteInstance = null;
let modalProduccionInstance = null;
let modalAjusteInstance = null;
let modalKardexPorcionesInstance = null;

let maxBloquesPorPagina = 1;
let paginaActualKardex = 1;
let bloquesKardexPaginados = [];
let kardexDataFiltrada = [];
let categoriaKardexActual = '';
let kardexData = [];

let ordenamientoKardexDireccion = {
    fecha: true,
    origen: false,
    detalle: false,
    merma: false,
    cantidad: false,
    saldo: false
};

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

function abrirModalLote(idInsumo, nombre, categoria) {
    document.getElementById('loteIdInsumo').value = idInsumo;
    document.getElementById('loteCategoriaInsumo').value = categoria;
    document.getElementById('loteNombreInsumo').innerText = nombre;

    // Limpiar inputs
    document.getElementById('loteKg').value = '';
    document.getElementById('lotePorcionesPorKg').value = '';
    document.getElementById('loteCosto').value = '';
    document.getElementById('loteObservacion').value = '';

    const contenedorPorciones = document.getElementById('contenedorPorcionesLote');
    const lblCantidad = document.getElementById('lblCantidadComprada');

    if (categoria === 'PROTEINA') {
        if(contenedorPorciones) contenedorPorciones.classList.remove('d-none');
        if(lblCantidad) lblCantidad.innerText = "Kg Comprados *";
        document.getElementById('loteKg').placeholder = "Ej: 10";
    } else {
        if(contenedorPorciones) contenedorPorciones.classList.add('d-none');
        if(lblCantidad) lblCantidad.innerText = "Cantidad Comprada (Kg/Gr/Sacos) *";
        document.getElementById('loteKg').placeholder = "Ej: 2 (Sacos o Kilos)";
    }

    if (typeof modalLoteInstance !== 'undefined' && modalLoteInstance) {
        modalLoteInstance.show();
    } else {
        const modal = new bootstrap.Modal(document.getElementById('modalLote'));
        modal.show();
    }
}

async function guardarLote() {
    const idInsumo       = document.getElementById('loteIdInsumo').value;
    const categoria      = document.getElementById('loteCategoriaInsumo').value;
    const kgComprados    = document.getElementById('loteKg').value;
    const costoTotal     = document.getElementById('loteCosto').value;
    const observacion    = document.getElementById('loteObservacion').value;

    let porcionesPorKg = document.getElementById('lotePorcionesPorKg').value;
    if (categoria !== 'PROTEINA') {
        porcionesPorKg = "1.0";
    }

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
            if (typeof modalLoteInstance !== 'undefined' && modalLoteInstance) modalLoteInstance.hide();
            AppUtils.showNotification('Ingreso registrado con éxito', 'success');
            await new Promise(resolve => setTimeout(resolve, 600));
            location.reload();
        } else {
            AppUtils.showNotification('Error al procesar el registro', 'error');
        }
    } catch (e) {
        AppUtils.showLoading(false);
        AppUtils.showNotification('Error de conexión con el servidor', 'error');
    }
}

async function abrirModalProduccion(idInsumo, nombre) {
    document.getElementById('prodIdInsumo').value = idInsumo;
    document.getElementById('prodNombreInsumo').innerText = nombre;

    document.getElementById('prodKg').value = '';
    document.getElementById('prodObtenidas').value = '';
    document.getElementById('prodMerma').value = '';
    document.getElementById('prodObservacion').value = '';

    const selectLote = document.getElementById('prodSelectLote');
    selectLote.innerHTML = '<option value="">Cargando lotes...</option>';

    if (typeof modalProduccionInstance !== 'undefined' && modalProduccionInstance) {
        modalProduccionInstance.show();
    }

    try {
        const res = await fetch(`/proteinas/lotes/${idInsumo}`);
        const lotes = await res.json();

        const lotesVigentes = lotes.filter(l => (l.saldoKg !== undefined && l.saldoKg !== null ? l.saldoKg : l.kgComprados) > 0);

        if (lotesVigentes.length === 0) {
            selectLote.innerHTML = '<option value="">Sin lotes con saldo disponible</option>';
            document.getElementById('prodKg').disabled = true;
            return;
        }

        document.getElementById('prodKg').disabled = false;

        selectLote.innerHTML = lotesVigentes.map(l => {
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

        inputKg.max = maxSaldo;
        inputKg.placeholder = `Máx: ${maxSaldo.toFixed(2)} kg`;

        if (parseFloat(inputKg.value) > maxSaldo) {
            inputKg.value = maxSaldo;
            AppUtils.showNotification(`Se ajustó la cantidad al máximo disponible (${maxSaldo.toFixed(2)} kg)`, 'warning');
            calcularMerma();
        }
    }
}

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
    const mermaKg = document.getElementById('prodMerma').value;
    const observacion  = document.getElementById('prodObservacion').value;

    if (!idLote) {
        AppUtils.showNotification('Debe seleccionar un lote disponible', 'error');
        return;
    }
    if (!kgProcesados || parseFloat(kgProcesados) <= 0) {
        AppUtils.showNotification('Ingrese una cantidad válida a procesar', 'error');
        return;
    }
    if (!porcionesObtenidas || parseInt(porcionesObtenidas) <= 0) {
        AppUtils.showNotification('Ingrese las porciones reales obtenidas', 'error');
        return;
    }
    if (!mermaKg || parseFloat(mermaKg) < 0) {
        AppUtils.showNotification('Ingrese la merma obtenida en la balanza (puede ser 0)', 'error');
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
                mermaKg: parseFloat(mermaKg),
                observacion: observacion || null
            })
        });

        AppUtils.showLoading(false);

        if (res.ok) {
            if (typeof modalProduccionInstance !== 'undefined' && modalProduccionInstance) modalProduccionInstance.hide();
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

// ─── GESTIÓN DE KARDEX POR BLOQUES PAGINADOS ─────────────────────

async function abrirKardexPorciones(id, nombre, categoria) {
    // Asignación directa sobre la variable global ya existente en la cabecera
    categoriaKardexActual = categoria;

    const titulo = categoria === 'PROTEINA' ? `Kardex por Porciones: ${nombre}` : `Kardex de Ingresos: ${nombre}`;
    document.getElementById('tituloKardexPorciones').innerHTML = `<i class="bi bi-clock-history me-2"></i>${titulo}`;

    const elementosMerma = document.querySelectorAll('.col-merma-kardex');
    elementosMerma.forEach(el => el.style.display = (categoria === 'PROTEINA') ? 'table-cell' : 'none');

    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (cuerpo) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Estructurando bloques indexed...</td></tr>';
    }

    // Resetear los inputs estáticos del rango de fechas y texto
    if (document.getElementById('searchKardexTexto')) document.getElementById('searchKardexTexto').value = '';
    if (document.getElementById('searchKardexFechaInicio')) document.getElementById('searchKardexFechaInicio').value = '';
    if (document.getElementById('searchKardexFechaFin')) document.getElementById('searchKardexFechaFin').value = '';

    // Sincronizar botones de filtro de origen nativos en el HTML
    document.querySelectorAll('.btn-filtro').forEach(btn => {
        btn.classList.remove('active', 'btn-dark', 'btn-success', 'btn-warning', 'btn-secondary', 'btn-danger');
        btn.classList.add('btn-outline-secondary');
    });

    const btnTodos = document.querySelector('[data-filtro="TODOS"]') || document.querySelector('.btn-filtro[data-filtro="TODOS"]');
    if (btnTodos) {
        btnTodos.classList.add('active', 'btn-dark');
        btnTodos.classList.remove('btn-outline-secondary');
    }

    if (typeof modalKardexPorcionesInstance !== 'undefined' && modalKardexPorcionesInstance) {
        modalKardexPorcionesInstance.show();
    } else {
        const modal = new bootstrap.Modal(document.getElementById('modalKardexPorciones'));
        modal.show();
    }

    try {
        const res = await fetch(`/proteinas/kardex/${id}`);
        const dataOriginal = await res.json();

        kardexData = dataOriginal.reverse();
        kardexDataFiltrada = [...kardexData];

        paginaActualKardex = 1;
        procesarYRenderizarBloquesKardex(kardexDataFiltrada, categoria);
    } catch (e) {
        if (cuerpo) {
            cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-danger py-3">Error al compilar el historial asíncrono.</td></tr>';
        }
    }
}

function filtrarKardex(filtro) {
    // Removemos la clase activa de todos los botones de la barra superior del modal
    document.querySelectorAll('.btn-filtro, .filtro-prod, .filtro-ajuste, .filtro-venta').forEach(btn => {
        btn.classList.remove('active');
    });

    // Buscamos el botón al que se le dio clic y lo encendemos visualmente
    // Esto soporta tanto si tus botones usan class "btn-filtro" como clases específicas
    const btnActivo = document.querySelector(`[data-filtro="${filtro}"]`) || document.querySelector(`.btn-filtro[data-filtro="${filtro}"]`);
    if (btnActivo) btnActivo.classList.add('active');

    // 🚨 REGLA DE ORO DE LA APP:
    // Si el usuario ya le dio clic a una cabecera para ordenar (Vista de Auditoría Global),
    // el filtro debe aplicarse inmediatamente sobre la tabla plana unificada.
    const franjaAuditoriaActiva = document.querySelector('.table-warning');

    if (franjaAuditoriaActiva) {
        // Ejecuta el filtro combinando Texto + Fecha + El nuevo Origen seleccionado (Vista Plana)
        ejecutarFiltroCombinadoKardex();
    } else {
        // Si no hay ordenamiento activo, recalculamos los bloques lógicos de forma normal
        paginaActualKardex = 1; // Reseteamos la pestaña a la primera hoja
        ejecutarFiltroCombinadoKardex();
    }
}

function procesarYRenderizarBloquesKardex(movimientos, categoria) {
    let bloquesTemporales = [];
    let bloqueActual = null;

    // 1. FILTRAR DUPLICIDAD CRÍTICA (Se mantiene intacto tu filtro de auditoría)
    let movimientosLimpios = [];
    for (let i = 0; i < movimientos.length; i++) {
        let movActual = movimientos[i];
        let esAjusteSospechoso = (movActual.origen || movActual.motivo || '').toUpperCase() === 'AJUSTE';

        if (esAjusteSospechoso && i > 0) {
            let movPrevio = movimientos[i - 1];
            let previoEsProduccion = (movPrevio.origen || '').toUpperCase() === 'PRODUCCION';

            if (previoEsProduccion && Math.abs(movActual.cantidad) === Math.abs(movPrevio.cantidad)) {
                console.warn(`[La Jama - Auditoría] Removido registro duplicado por Ajuste automático: ${movActual.cantidad}`);
                continue;
            }
        }
        movimientosLimpios.push(movActual);
    }

    // 2. AGRUPACIÓN CORREGIDA CRONOLÓGICA DIRECTA
    // Recorremos los movimientos tal como vienen del backend (de antiguo a reciente)
    // para que el "LOTE" o "ENTRADA" sea el primer elemento que abra y funde el bloque.
    movimientosLimpios.forEach((mov) => {
        const origen = (mov.origen || mov.motivo || '').toUpperCase();
        const esRecargaAdmin = origen.includes('LOTE') || origen.includes('ENTRADA');

        // Si es una recarga del administrador O es el primerísimo movimiento de la historia, fundamos un nuevo bloque
        if (esRecargaAdmin || !bloqueActual) {
            if (bloqueActual) {
                bloquesTemporales.push(bloqueActual);
            }
            bloqueActual = {
                id: bloquesTemporales.length + 1,
                fechaLote: mov.fecha, // La fecha de apertura será exactamente la del Lote comprado
                movimientos: []
            };
        }
        // Insertamos el movimiento dentro del bloque actual
        bloqueActual.movimientos.push(mov);
    });

    if (bloqueActual) bloquesTemporales.push(bloqueActual);

    // 3. INVERSIÓN VISUAL FINAL
    // Invertimos los bloques para que el Bloque más alto (Lote Actual) aparezca primero.
    bloquesKardexPaginados = bloquesTemporales.reverse();

    // Renderizamos de inmediato la vista actual
    renderizarFilaPaginada(categoria);
}

function renderizarFilaPaginada(categoria) {
    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (!cuerpo) return;

    if (!bloquesKardexPaginados || bloquesKardexPaginados.length === 0 || bloquesKardexPaginados[0].movimientos.length === 0) {
        cuerpo.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-5"><i class="bi bi-folder-x fs-3 d-block mb-2 text-secondary"></i>No se encontraron movimientos.</td></tr>';
        removerControlesPaginacionExistentes();
        return;
    }

    const inicio = (paginaActualKardex - 1) * maxBloquesPorPagina;
    const fin = inicio + maxBloquesPorPagina;
    const bloquesVisibles = bloquesKardexPaginados.slice(inicio, fin);

    if (bloquesVisibles.length === 0) {
        paginaActualKardex = 1;
        renderizarFilaPaginada(categoria);
        return;
    }

    let htmlFilas = '';

    // Recorremos los bloques visibles en la pestaña actual
    bloquesVisibles.forEach(bloque => {
        let fechaCabecera = '-';
        if (bloque.fechaLote) {
            fechaCabecera = bloque.fechaLote.includes('T')
                ? new Date(bloque.fechaLote).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : bloque.fechaLote;
        }

        const maxIdEnHistorial = Math.max(...bloquesKardexPaginados.map(b => b.id));
        const esLoteActual = (bloque.id === maxIdEnHistorial);

        htmlFilas += `
            <tr class="table-sticky-divider">
                <td colspan="6" class="ps-3 py-2 internal-block-header fw-bold">
                    <div class="d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-box-seam-fill me-2 text-jama-gold"></i>AUDITORÍA DE STOCK — BLOQUE #${bloque.id} ${esLoteActual ? '<span class="badge bg-danger ms-2 animate-pulse" style="font-size:0.65rem; letter-spacing:0.5px;">LOTE ACTUAL</span>' : ''}</span>
                        <span class="badge bg-jama-translucid text-dark small"><i class="bi bi-calendar3 me-1"></i>Apertura: ${fechaCabecera}</span>
                    </div>
                </td>
            </tr>
        `;

        const movsInvertidos = [...bloque.movimientos].reverse();

        movsInvertidos.forEach(mov => {
            let fecha = '-';
            if (mov.fecha) {
                fecha = mov.fecha.includes('T')
                    ? new Date(mov.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : mov.fecha;
            }

            const detalle = mov.detalle || mov.motivo || '-';
            const origen = mov.origen || 'LOGÍSTICA';
            const esIngreso = mov.signo === '+' || mov.tipo === 'INGRESO';
            const signo = esIngreso ? '+' : '-';
            const colorCantidad = esIngreso ? 'text-success' : 'text-danger';

            let cantidadTexto = '-';
            if (mov.cantidad !== undefined && mov.cantidad !== null) {
                cantidadTexto = typeof mov.cantidad === 'number' ? `${mov.cantidad} porc.` : mov.cantidad;
            }

            let stockFinal = '-';
            if (mov.stockResultante !== undefined && mov.stockResultante !== null && mov.stockResultante !== 'null' && mov.stockResultante !== '') {
                stockFinal = mov.stockResultante;
            } else if (mov.stockFinal !== undefined && mov.stockFinal !== null && mov.stockFinal !== 'null' && mov.stockFinal !== '') {
                stockFinal = mov.stockFinal;
            }

            let textoMerma = '-';
            if (mov.mermaKg !== undefined && mov.mermaKg !== null) {
                textoMerma = parseFloat(mov.mermaKg).toFixed(3);
            }

            htmlFilas += `
                <tr class="align-middle">
                    <td class="ps-3 text-muted small">${fecha}</td>
                    <td>${typeof badgeOrigen === 'function' ? badgeOrigen(origen) : `<span class="badge bg-secondary">${origen}</span>`}</td>
                    <td class="fw-semibold text-secondary small">${detalle}</td>
                    <td class="text-end col-merma-kardex text-danger fw-bold">${textoMerma}</td>
                    <td class="text-end fw-bold ${colorCantidad}">${signo} ${cantidadTexto}</td>
                    <td class="text-end pe-3 fw-bold text-dark">${stockFinal}</td>
                </tr>
            `;
        });
    });

    cuerpo.innerHTML = htmlFilas;

    const elementosMerma = document.querySelectorAll('.col-merma-kardex');
    elementosMerma.forEach(el => el.style.display = (categoria === 'PROTEINA') ? 'table-cell' : 'none');

    inyectarControlesPaginacion(categoria);
}

function inyectarControlesPaginacion(categoria) {
    const footerEstatico = document.getElementById('nav-paginador-kardex');
    if (!footerEstatico) return;

    // Calculamos el total de hojas dividiendo el total de bloques entre el límite elegido
    const totalPaginas = Math.ceil(bloquesKardexPaginados.length / maxBloquesPorPagina);
    if (totalPaginas <= 0) {
        footerEstatico.innerHTML = '';
        return;
    }

    let maxBotonesVisibles = 5;
    let paginaInicio = Math.max(1, paginaActualKardex - Math.floor(maxBotonesVisibles / 2));
    let paginaFin = paginaInicio + maxBotonesVisibles - 1;

    if (paginaFin > totalPaginas) {
        paginaFin = totalPaginas;
        paginaInicio = Math.max(1, paginaFin - maxBotonesVisibles + 1);
    }

    let listaItems = '';
    for (let i = paginaInicio; i <= paginaFin; i++) {
        const activa = i === paginaActualKardex ? 'btn-pag-jama-active' : 'btn-pag-jama-inactive';

        // El texto ahora se adapta: si muestra 1 bloque dice "Bloque X", si muestra varios dice "Pág X"
        const textoBoton = maxBloquesPorPagina === 1
            ? `Bloque ${bloquesKardexPaginados[i - 1]?.id || i}`
            : `Pág. ${i}`;

        listaItems += `
            <li class="page-item d-inline-block">
                <button class="page-link-jama-block ${activa}"
                        onclick="window.cambiarPaginaKardex(${i}, '${categoria}')">${textoBoton}</button>
            </li>
        `;
    }

    const bloqueVisibleActual = bloquesKardexPaginados[(paginaActualKardex - 1) * maxBloquesPorPagina]?.id || 1;

    footerEstatico.innerHTML = `
        <div class="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2 p-2 bg-light rounded-bottom-4">
            <div class="d-flex align-items-center gap-1 bg-white p-1 rounded border shadow-sm" style="max-width: 190px; border-color: var(--lajama-peach) !important;">
                <span class="text-muted small ps-1 fw-bold" style="font-size:0.68rem; color: var(--lajama-green) !important;">IR AL BLOQUE:</span>
                <input type="number" id="inputDestinoBloque" min="1" max="${bloquesKardexPaginados.length}"
                       class="form-control form-control-sm text-center fw-bold border-0 p-0 text-dark"
                       style="width: 40px; background: transparent;" placeholder="${bloqueVisibleActual}">
                <button type="button" class="btn btn-jama btn-sm rounded-2 py-0 px-2" style="height:24px;"
                        onclick="window.saltarABloqueManual('${categoria}', ${bloquesKardexPaginados.length})">
                    <i class="bi bi-arrow-right-short fs-5" style="line-height:0;"></i>
                </button>
            </div>
            <ul class="pagination pagination-sm justify-content-center mb-0 gap-1 flex-wrap">
                ${listaItems}
            </ul>
            <div class="text-end text-muted fw-semibold" style="font-size: 0.75rem;">
                Viendo bloque inicial <span class="badge bg-dark text-white rounded-pill px-2">#${bloqueVisibleActual}</span> de ${bloquesKardexPaginados.length} bloques totales
            </div>
        </div>
    `;
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

function ejecutarFiltroCombinadoKardex() {
    const texto = (document.getElementById('searchKardexTexto')?.value || '').toLowerCase().trim();
    const fechaSeleccionada = document.getElementById('searchKardexFecha')?.value || '';

    const btnActivo = document.querySelector('.btn-filtro.active');
    const filtroOrigen = btnActivo ? btnActivo.getAttribute('data-filtro') : 'TODOS';

    kardexDataFiltrada = kardexData.filter(mov => {
        if (filtroOrigen !== 'TODOS' && mov.origen !== filtroOrigen) return false;
        if (fechaSeleccionada && !(mov.fecha || '').includes(fechaSeleccionada)) return false;

        if (texto) {
            const detalle = (mov.detalle || mov.motivo || '').toLowerCase();
            const origenStr = (mov.origen || '').toLowerCase();
            const cantidadStr = (mov.cantidad || '').toString();
            if (!detalle.includes(texto) && !origenStr.includes(texto) && !cantidadStr.includes(texto)) return false;
        }
        return true;
    });

    paginaActualKardex = 1;
    procesarYRenderizarBloquesKardex(kardexDataFiltrada, categoriaKardexActual);
}

function safeGetValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
}

function filtrarCatalogo() {
    const input = document.getElementById('buscadorInsumos').value.toLowerCase();
    const filas = document.querySelectorAll('.fila-insumo');

    filas.forEach(fila => {
        const nombre = fila.querySelector('.nombre-insumo').textContent.toLowerCase();
        const categoria = fila.querySelector('.categoria-insumo').textContent.toLowerCase();

        if (nombre.includes(input) || categoria.includes(input)) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
}

// ─── GESTIÓN DE EDICIÓN DE INSUMOS ORIGINAL SANADA ──────────────────
let modalEditarInstance;

document.addEventListener('DOMContentLoaded', () => {
    const modalEditarEl = document.getElementById('modalEditarInsumo');
    if (modalEditarEl) {
        modalEditarInstance = new bootstrap.Modal(modalEditarEl);
    }
});

function prepararEdicionInsumo(id, nombre, categoria, unidad, actual, minimo) {
    document.getElementById('editInsumoId').value = id;
    document.getElementById('editInsumoNombre').value = nombre;
    document.getElementById('editInsumoCategoria').value = categoria;
    document.getElementById('editInsumoUnidad').value = unidad;

    const inputActual = document.getElementById('editInsumoStockActual');
    if(inputActual) {
        inputActual.value = actual || 0;
    }

    document.getElementById('editInsumoStockMinimo').value = minimo || 0;

    if (modalEditarInstance) {
        modalEditarInstance.show();
    }
}

function filtrarTablaPrincipal() {
    const textoBuscado = document.getElementById('buscadorPrincipal').value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpoTablaPrincipal .fila-insumo-principal');

    filas.forEach(fila => {
        const nombreInsumo = fila.querySelector('.nombre-insumo-principal').textContent.toLowerCase();
        if (nombreInsumo.includes(textoBuscado)) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
}


// 8. REEMPLAZO: Navegador asíncrono instantáneo por click
window.cambiarPaginaKardex = function(numeroPagina, categoria) {
    paginaActualKardex = numeroPagina;
    renderizarFilaPaginada(categoria);
};

window.cambiarTamanoBloquesKardex = function(nuevoTamano) {
    maxBloquesPorPagina = parseInt(nuevoTamano);
    paginaActualKardex = 1; // Reseteamos a la hoja inicial
    renderizarFilaPaginada(categoriaKardexActual);
};

window.saltarABloqueManual = function(categoria, totalMaximo) {
    const input = document.getElementById('inputDestinoBloque');
    if (!input) return;

    let valor = parseInt(input.value);
    if (isNaN(valor) || valor < 1 || valor > totalMaximo) {
        if (typeof AppUtils !== 'undefined') AppUtils.showNotification(`Bloque inválido (1 - ${totalMaximo})`, 'error');
        input.value = '';
        return;
    }

    paginaActualKardex = totalMaximo - valor + 1;
    renderizarFilaPaginada(categoria);
};

// =================================================================
// 🎛️ PUENTES DE CONEXIÓN: HTML ONCLICK -> JS MOTOR (LA JAMA)
// =================================================================

function manejadorModalLote(btn) {
    if (typeof abrirModalLote === 'function') {
        abrirModalLote(
            btn.getAttribute('data-id'),
            btn.getAttribute('data-nombre'),
            btn.getAttribute('data-categoria')
        );
    } else {
        console.error("[La Jama - Error] La función abrirModalLote no está cargada.");
    }
}

function manejadorModalProduccion(btn) {
    if (typeof abrirModalProduccion === 'function') {
        abrirModalProduccion(
            btn.getAttribute('data-id'),
            btn.getAttribute('data-nombre')
        );
    } else {
        console.error("[La Jama - Error] La función abrirModalProduccion no está cargada.");
    }
}

function manejadorModalAjuste(btn) {
    if (typeof abrirModalAjuste === 'function') {
        abrirModalAjuste(
            btn.getAttribute('data-id'),
            btn.getAttribute('data-nombre')
        );
    } else {
        console.error("[La Jama - Error] La función abrirModalAjuste no está cargada.");
    }
}

function manejadorModalKardex(btn) {
    if (typeof abrirKardexPorciones === 'function') {
        abrirKardexPorciones(
            id = btn.getAttribute('data-id'),
            nombre = btn.getAttribute('data-nombre'),
            categoria = btn.getAttribute('data-categoria')
        );
    } else {
        console.error("[La Jama - Error] La función abrirKardexPorciones no está cargada.");
    }
}

function manejadorModalEditar(btn) {
    if (typeof prepararEdicionInsumo === 'function') {
        prepararEdicionInsumo(
            btn.getAttribute('data-id'),
            btn.getAttribute('data-nombre'),
            btn.getAttribute('data-categoria'),
            btn.getAttribute('data-unidad'),
            btn.getAttribute('data-actual'),
            btn.getAttribute('data-minimo')
        );
    } else {
        console.error("[La Jama - Error] La función prepararEdicionInsumo no está cargada.");
    }
}

// Adaptador de interfaz para Armar Recetas (Evita que quede huérfano)
function actualizarPlaceholderReceta(select) {
    const option = select.options[select.selectedIndex];
    if (!option) return;

    const categoria = option.getAttribute('data-categoria');
    const unidad = option.getAttribute('data-unidad');
    const input = document.getElementById('inputCantidadReceta');
    if (!input) return;

    if (categoria === 'PROTEINA') {
        input.placeholder = "Para proteínas ingresa 1 (porción)";
        input.value = 1;
    } else if (unidad) {
        input.placeholder = `Cantidad requerida en ${unidad} (Ej: 0.2)`;
        input.value = '';
    } else {
        input.placeholder = "Cantidad requerida";
    }
}

window.ordenarKardexPorColumna = function(columna) {
    // 1. Identificamos el bloque específico que el administrador está viendo en pantalla
    if (paginaActualKardex > bloquesKardexPaginados.length) paginaActualKardex = 1;
    const bloqueIndex = paginaActualKardex - 1;
    const bloqueActual = bloquesKardexPaginados[bloqueIndex];

    if (!bloqueActual || !bloqueActual.movimientos || bloqueActual.movimientos.length === 0) return;

    // 2. Invertimos el sentido de ordenación de la columna seleccionada
    ordenamientoKardexDireccion[columna] = !ordenamientoKardexDireccion[columna];
    const ordenAscendente = ordenamientoKardexDireccion[columna];

    // Sincronizar glifos de flechas en las cabeceras
    document.querySelectorAll('#modalKardexPorciones thead th').forEach(th => {
        th.innerHTML = th.innerHTML.replace(/ 🔼| 🔽/g, '');
    });
    const thActual = document.querySelector(`#modalKardexPorciones thead th[data-sort="${columna}"]`);
    if (thActual) {
        thActual.innerHTML += ordenAscendente ? ' 🔼' : ' 🔽';
    }

    // 3. ORDENACIÓN LOCALIZADA: Ordenamos únicamente el array de movimientos de ESTE bloque
    bloqueActual.movimientos.sort((a, b) => {
        let valA, valB;
        switch (columna) {
            case 'fecha':
                valA = new Date(a.fecha || 0).getTime();
                valB = new Date(b.fecha || 0).getTime();
                break;
            case 'origen':
                valA = (a.origen || '').toLowerCase();
                valB = (b.origen || '').toLowerCase();
                break;
            case 'detalle':
                valA = (a.detalle || a.motivo || '').toLowerCase();
                valB = (b.detalle || b.motivo || '').toLowerCase();
                break;
            case 'merma':
                valA = parseFloat(a.mermaKg) || 0;
                valB = parseFloat(b.mermaKg) || 0;
                break;
            case 'cantidad':
                valA = parseFloat(a.cantidad) || 0;
                valB = parseFloat(b.cantidad) || 0;
                break;
            case 'saldo':
                valA = parseFloat(a.stockResultante || a.stockFinal) || 0;
                valB = parseFloat(b.stockResultante || b.stockFinal) || 0;
                break;
            default:
                return 0;
        }

        if (valA < valB) return ordenAscendente ? -1 : 1;
        if (valA > valB) return ordenAscendente ? 1 : -1;
        return 0;
    });

    // Refrescamos la visualización inmediatamente manteniendo la estructura de bloque y paginación fija
    renderizarFilaPaginada(categoriaKardexActual);
};

function renderizarTablaKardexPlanaDirecta() {
    const cuerpo = document.getElementById('cuerpoKardexPorciones');
    if (!cuerpo) return;

    let htmlFilas = `
        <tr class="table-warning">
            <td colspan="6" class="text-center py-2 fw-bold text-dark small animate__animated animate__flash" style="letter-spacing:0.5px;">
                ⚠️ VISTA DE AUDITORÍA GLOBAL ACTIVA (Ordenamiento personalizado seleccionado — Bloques ocultos temporalmente)
            </td>
        </tr>
    `;

    kardexDataFiltrada.forEach(mov => {
        let fecha = '-';
        if (mov.fecha) {
            fecha = mov.fecha.includes('T')
                ? new Date(mov.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : mov.fecha;
        }

        const detalle = mov.detalle || mov.motivo || '-';
        const origen = mov.origen || 'LOGÍSTICA';
        const esIngreso = mov.signo === '+' || mov.tipo === 'INGRESO';
        const signo = esIngreso ? '+' : '-';
        const colorCantidad = esIngreso ? 'text-success' : 'text-danger';

        let cantidadTexto = '-';
        if (mov.cantidad !== undefined && mov.cantidad !== null) {
            cantidadTexto = typeof mov.cantidad === 'number' ? `${mov.cantidad} porc.` : mov.cantidad;
        }

        let stockFinal = '-';
        if (mov.stockResultante !== undefined && mov.stockResultante !== null && mov.stockResultante !== 'null' && mov.stockResultante !== '') {
            stockFinal = mov.stockResultante;
        } else if (mov.stockFinal !== undefined && mov.stockFinal !== null && mov.stockFinal !== 'null' && mov.stockFinal !== '') {
            stockFinal = mov.stockFinal;
        }

        let textoMerma = '-';
        if (mov.mermaKg !== undefined && mov.mermaKg !== null) {
            textoMerma = parseFloat(mov.mermaKg).toFixed(3);
        }

        htmlFilas += `
            <tr class="align-middle animate__animated animate__fadeIn">
                <td class="ps-3 text-muted small">${fecha}</td>
                <td>${typeof badgeOrigen === 'function' ? badgeOrigen(origen) : `<span class="badge bg-secondary">${origen}</span>`}</td>
                <td class="fw-semibold text-secondary small">${detalle}</td>
                <td class="text-end col-merma-kardex text-danger fw-bold">${textoMerma}</td>
                <td class="text-end fw-bold ${colorCantidad}">${signo} ${cantidadTexto}</td>
                <td class="text-end pe-3 fw-bold text-dark">${stockFinal}</td>
            </tr>
        `;
    });

    cuerpo.innerHTML = htmlFilas;

    // Sincronizar columna merma
    const elementosMerma = document.querySelectorAll('.col-merma-kardex');
    elementosMerma.forEach(el => el.style.display = (categoriaKardexActual === 'PROTEINA') ? 'table-cell' : 'none');

    // Desactivamos temporalmente el paginador inferior de bloques para no causar confusiones visuales
    removerControlesPaginacionExistentes();
}
function badgeOrigen(origen) {
    const origenFormateado = (origen || '').toUpperCase().trim();

    const map = {
        'LOTE':       '<span class="badge bg-light-success text-success border px-2 py-1 rounded-pill small fw-bold">🛒 Lote</span>',
        'PRODUCCION': '<span class="badge bg-light-warning text-warning-dark border px-2 py-1 rounded-pill small fw-bold">🔥 Producción</span>',
        'AJUSTE':     '<span class="badge bg-light-secondary text-secondary border px-2 py-1 rounded-pill small fw-bold">⚙️ Ajuste</span>',
        'VENTA':      '<span class="badge bg-light-danger text-danger border px-2 py-1 rounded-pill small fw-bold">📦 Venta</span>',
        'LOGÍSTICA':  '<span class="badge bg-light border px-2 py-1 rounded-pill small text-dark">📦 Logística</span>'
    };

    return map[origenFormateado] ?? `<span class="badge bg-light border px-2 py-1 rounded-pill small text-dark">${origen}</span>`;
}

function ejecutarFiltroCombinadoKardex() {
    const texto = (document.getElementById('searchKardexTexto')?.value || '').toLowerCase().trim();
    const fechaInicioStr = document.getElementById('searchKardexFechaInicio')?.value || ''; // YYYY-MM-DD
    const fechaFinStr = document.getElementById('searchKardexFechaFin')?.value || ''; // YYYY-MM-DD

    const btnActivo = document.querySelector('.btn-filtro.active');
    const filtroOrigen = btnActivo ? btnActivo.getAttribute('data-filtro') : 'TODOS';

    // Convertimos los rangos de fecha a timestamps a medianoche para comparación exacta
    const timeInicio = fechaInicioStr ? new Date(fechaInicioStr + 'T00:00:00').getTime() : null;
    const timeFin = fechaFinStr ? new Date(fechaFinStr + 'T23:59:59').getTime() : null;

    kardexDataFiltrada = kardexData.filter(mov => {
        if (filtroOrigen !== 'TODOS' && mov.origen !== filtroOrigen) return false;

        // 🚨 CONTROL DE RANGO DE FECHAS GENERAL
        if (mov.fecha) {
            const timeMov = new Date(mov.fecha).getTime();
            if (timeInicio && timeMov < timeInicio) return false;
            if (timeFin && timeMov > timeFin) return false;
        }

        if (texto) {
            const detalle = (mov.detalle || mov.motivo || '').toLowerCase();
            const origenStr = (mov.origen || '').toLowerCase();
            const cantidadStr = (mov.cantidad || '').toString();
            if (!detalle.includes(texto) && !origenStr.includes(texto) && !cantidadStr.includes(texto)) return false;
        }
        return true;
    });

    paginaActualKardex = 1; // Reseteamos a la primera página de bloques resultantes
    procesarYRenderizarBloquesKardex(kardexDataFiltrada, categoriaKardexActual);
}

window.invertirFlujoActualKardex = function() {
    // 1. Apagar visualmente los indicadores de ordenamiento (🔼 / 🔽) de las cabeceras de la tabla
    document.querySelectorAll('#modalKardexPorciones thead th').forEach(th => {
        th.innerHTML = th.innerHTML.replace(/ 🔼| 🔽/g, '');
    });

    // 2. Resetear el estado del objeto de ordenación por columnas a sus valores base falsos
    for (let columna in ordenamientoKardexDireccion) {
        ordenamientoKardexDireccion[columna] = false;
    }

    // 3. INVERSIÓN ADAPTATIVA:
    // Evaluamos si el set de bloques está activo o si el administrador está auditando un bloque
    if (bloquesKardexPaginados && bloquesKardexPaginados.length > 0) {

        // Verificamos si hay una advertencia de ordenación plana o si trabajamos sobre la estructura de bloques
        const franjaAuditoriaActiva = document.querySelector('.table-warning');

        if (franjaAuditoriaActiva) {
            // Si la tabla está plana, invertimos el array unificado filtrado directamente
            kardexDataFiltrada.reverse();
            renderizarTablaKardexPlanaDirecta();
        } else {
            // Si mantenemos la estructura de bloques por lotes, invertimos el orden de las colecciones de bloques
            bloquesKardexPaginados.reverse();

            // También invertimos los movimientos internos de cada bloque individual para que el flujo sea simétrico
            bloquesKardexPaginados.forEach(bloque => {
                if (bloque.movimientos) bloque.movimientos.reverse();
            });

            // Refrescamos la vista de la pestaña actual de bloques de manera instantánea
            renderizarFilaPaginada(categoriaKardexActual);
        }

        if (typeof AppUtils !== 'undefined') {
            AppUtils.showNotification('Sentido del historial invertido', 'success');
        }
    }
};

window.invertirSoloContenidoBloque = function() {
    // 1. Limpiamos los indicadores de ordenamiento de las cabeceras para evitar conflictos de renderizado
    document.querySelectorAll('#modalKardexPorciones thead th').forEach(th => {
        th.innerHTML = th.innerHTML.replace(/ 🔼| 🔽/g, '');
    });

    // 2. Reseteamos el estado del objeto de ordenación por columnas
    for (let columna in ordenamientoKardexDireccion) {
         ordenamientoKardexDireccion[columna] = false;
    }

    // 3. INVERSIÓN LOCALIZADA DE CONTENIDO:
    if (bloquesKardexPaginados && bloquesKardexPaginados.length > 0) {
        // Recorremos todos los bloques y volteamos únicamente su historial interno de movimientos
        bloquesKardexPaginados.forEach(bloque => {
            if (bloque.movimientos) {
                bloque.movimientos.reverse();
            }
        });

        // Refrescamos la pantalla inmediatamente en la pestaña actual
        renderizarFilaPaginada(categoriaKardexActual);

        if (typeof AppUtils !== 'undefined') {
            AppUtils.showNotification('Historial interno del bloque invertido', 'success');
        }
    }
};