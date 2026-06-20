// =========================================================================
// ENRUTAMIENTO DINÁMICO Y AUDITORÍA EN VIVO PARA LA CAJA (LA JAMA)
// =========================================================================
let selectedPedidoId = null;
let paginaActual = 1;
const registrosPorPagina = 8;
let datosPedidoActualCaja = null;

// ── Helpers nativos de apertura y cierre de modales ──────────────────────
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('mostrar-modal');
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('mostrar-modal');
}

// ── Inicializador del Módulo ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('param-aprobado')) AppUtils.showNotification("Pedido enviado a cocina.", "success");
    if (document.getElementById('param-success')) AppUtils.showNotification("¡Cobro cuadrado e ingreso registrado!", "success");

    // Buscador en caliente de comandas de salón
    const buscador = document.getElementById('buscadorPedido');
    const tabla = document.getElementById('tablaCaja')?.getElementsByTagName('tbody')[0];

    if (buscador && tabla) {
        buscador.addEventListener('keyup', function() {
            const texto = buscador.value.toLowerCase();
            const filas = tabla.getElementsByTagName('tr');

            Array.from(filas).forEach(fila => {
                if(fila.classList.contains('fila-pedido-caja')) {
                    const coincide = fila.textContent.toLowerCase().includes(texto);
                    if (coincide) {
                        fila.classList.remove('excluido-por-busqueda');
                    } else {
                        fila.classList.add('excluido-por-busqueda');
                    }
                }
            });
            paginaActual = 1;
            inicializarPaginacionLocal();
        });
    }

    inicializarPaginacionLocal();
});

// ── Control de Dashboard ───────────────────────────────────────────────
function abrirPlanoMesasDesdeCaja() {
    const iframe = document.getElementById('iframePlanoMesas');
    if (iframe) iframe.contentWindow.location.reload();
    abrirModal('modalPlanoMesasCaja');
}

function verDetallesComandaAuditoria(btn) {
    const pedidoId = btn.getAttribute('data-id');
    AppUtils.showLoading(true);

    fetch(`/admin/caja/api/pedido/${pedidoId}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            AppUtils.showLoading(false);

            // 🛡️ ADUANA ANTI-NULOS EN RENDERIZADO
            const totalSeguro = data.montoTotal ? parseFloat(data.montoTotal).toFixed(2) : "0.00";

            document.getElementById('auditoriaIdPedido').innerText = data.id;
            document.getElementById('auditoriaTipo').innerText = data.tipoPedido;
            document.getElementById('auditoriaMesa').innerText = data.numeroMesa || "N/A";
            document.getElementById('auditoriaTotal').innerText = totalSeguro;

            const lista = document.getElementById('auditoriaListaPlatos');
            lista.innerHTML = "";

            if (data.detalles && data.detalles.length > 0) {
                data.detalles.forEach(d => {
                    if (d.canceladoPorCliente) return;
                    const subtotalItem = d.subtotal ? parseFloat(d.subtotal).toFixed(2) : "0.00";

                    lista.innerHTML += `
                        <div class="jama-detalle-item">
                            <span class="detalle-qty">${d.cantidad}x</span>
                            <span class="detalle-nombre">${d.producto?.nombre || 'Plato Desconocido'}</span>
                            <span class="detalle-monto">S/. ${subtotalItem}</span>
                        </div>`;
                });
            }
            abrirModal('modalDetalleAuditoria');
        })
        .catch(() => {
            AppUtils.showLoading(false);
            AppUtils.showNotification("Error al cargar la comanda de auditoría", "error");
        });
}

// ── Historial Asíncrono por rangos ─────────────────────────────────────
function inicializarHistorialFechas() {
    const inputInicio = document.getElementById('historialFechaInicio');
    const inputFin = document.getElementById('historialFechaFin');

    if (inputInicio && !inputInicio.value) {
        const hoy = new Date();
        const haceSieteDias = new Date();
        haceSieteDias.setDate(hoy.getDate() - 7);

        inputInicio.value = haceSieteDias.toISOString().split('T')[0];
        inputFin.value = hoy.toISOString().split('T')[0];
        consultarHistorialAsincrono();
    }
}

function consultarHistorialAsincrono() {
    const fechaInicio = document.getElementById('historialFechaInicio').value;
    const fechaFin = document.getElementById('historialFechaFin').value;
    const cuerpoTabla = document.getElementById('cuerpoHistorialCajas');

    if (!fechaInicio || !fechaFin) {
        AppUtils.showNotification("Por favor, selecciona un plazo de días válido.", "error");
        return;
    }

    AppUtils.showLoading(true);

    fetch(`/admin/caja/historial-datos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            AppUtils.showLoading(false);
            cuerpoTabla.innerHTML = "";

            if (data.length === 0) {
                cuerpoTabla.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--caja-secondary); font-size:0.85rem;">No se registraron cierres de caja en el rango seleccionado.</td></tr>`;
                return;
            }

            data.forEach(t => {
                const fApertura = t.fechaApertura.replace("T", " ").substring(0, 16);
                const fCierre = t.fechaCierre !== "null" && t.fechaCierre ? t.fechaCierre.replace("T", " ").substring(0, 16) : "Abierto";

                let badgeDiferencia = `<span class="texto-negrita" style="color:var(--caja-success);">S/. 0.00</span>`;
                if (t.diferencia > 0.05) {
                    badgeDiferencia = `<span class="jama-badge status-ingreso">+ S/. ${t.diferencia.toFixed(2)} (Sobrante)</span>`;
                } else if (t.diferencia < -0.05) {
                    badgeDiferencia = `<span class="jama-badge status-egreso">S/. ${t.diferencia.toFixed(2)} (Faltante)</span>`;
                }

                cuerpoTabla.innerHTML += `
                    <tr>
                        <td><span class="id-resaltado">#${t.id}</span></td>
                        <td class="texto-atenuado">${fApertura}</td>
                        <td class="texto-atenuado">${fCierre}</td>
                        <td class="texto-negrita">S/. ${t.montoApertura.toFixed(2)}</td>
                        <td class="monto-exito texto-negrita">S/. ${t.totalVendido.toFixed(2)}</td>
                        <td class="texto-negrita" style="color:var(--caja-secondary);">S/. ${t.montoCierre.toFixed(2)}</td>
                        <td>${badgeDiferencia}</td>
                        <td class="texto-atenuado" style="max-width:230px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${t.observaciones || ''}">
                            ${t.observaciones || "<i>Sin apuntes de entrega</i>"}
                        </td>
                    </tr>`;
            });
        })
        .catch(() => {
            AppUtils.showLoading(false);
            AppUtils.showNotification("No se pudo extraer la bitácora financiera.", "error");
        });
}

function cambiarPestañaCaja(idPanel, boton) {
    document.querySelectorAll('.jama-tab-panel').forEach(p => p.classList.remove('activo'));
    document.querySelectorAll('.jama-tab-link').forEach(b => b.classList.remove('activo'));

    document.getElementById(idPanel).classList.add('activo');
    boton.classList.add('activo');
}

// =========================================================================
// 🎛️ MOTOR DE PAGINACIÓN LOCAL (SÓLO APLICA A LA TABLA DE COMANDAS)
// =========================================================================
function inicializarPaginacionLocal() {
    const tabla = document.getElementById('tablaCaja');
    const infoStart = document.getElementById('pagStart');
    const infoEnd = document.getElementById('pagEnd');

    if (!tabla) {
        if (infoStart) infoStart.innerText = "0";
        if (infoEnd) infoEnd.innerText = "0";
        return;
    }

    if (typeof $ !== 'undefined' && $.fn.DataTable && $.fn.DataTable.isDataTable('#tablaCaja')) {
        try {
            $('#tablaCaja').DataTable().destroy();
        } catch(err) { console.log("Limpieza preventiva de DataTables realizada."); }
    }

    const filas = Array.from(tabla.querySelectorAll('tbody tr.fila-pedido-caja'));
    const filasVisibles = filas.filter(f => !f.classList.contains('excluido-por-busqueda'));

    const totalRegistros = filasVisibles.length;
    const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina) || 1;

    if (paginaActual > totalPaginas) paginaActual = totalPaginas;
    if (paginaActual < 1) paginaActual = 1;

    filas.forEach(f => {
        f.style.removeProperty('display');
        f.style.display = 'none';
    });

    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = Math.min(inicio + registrosPorPagina, totalRegistros);

    for (let i = inicio; i < fin; i++) {
        if (filasVisibles[i]) {
            filasVisibles[i].style.display = '';
        }
    }

    if (infoStart) infoStart.innerText = totalRegistros === 0 ? 0 : inicio + 1;
    if (infoEnd) infoEnd.innerText = fin;

    const contenedorPaginas = document.getElementById('contenedorPaginas');
    if (contenedorPaginas) {
        contenedorPaginas.innerHTML = "";
        for (let p = 1; p <= totalPaginas; p++) {
            const span = document.createElement('span');
            span.className = `pag-numero ${p === paginaActual ? 'activo' : ''}`;
            span.innerText = p;
            span.onclick = function() { irAPaginaLocal(p); };
            contenedorPaginas.appendChild(span);
        }
    }

    const btnAnt = document.getElementById('btnPagAnterior');
    const btnSig = document.getElementById('btnPagSiguiente');

    if (btnAnt) {
        btnAnt.onclick = null;
        btnAnt.onclick = function() {
            if (paginaActual > 1) {
                paginaActual--;
                inicializarPaginacionLocal();
            }
        };
    }
    if (btnSig) {
        btnSig.onclick = null;
        btnSig.onclick = function() {
            if (paginaActual < totalPaginas) {
                paginaActual++;
                inicializarPaginacionLocal();
            }
        };
    }
}

function irAPaginaLocal(numeroPagina) {
    paginaActual = numeroPagina;
    inicializarPaginacionLocal();
}

function abrirModalLocal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('activo');
}

function cerrarModalLocal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('activo');
}

async function abrirFlujoPagoDesdeFila(buttonElement) {
    const pedidoId = buttonElement.getAttribute('data-id');
    const numeroMesa = buttonElement.getAttribute('data-mesa') || "N/A";

    console.log(`🛰️ [Aduana Caja] Trayendo platos de la Comanda #${pedidoId} para previsualización selectiva`);

    // Guardamos los datos base en las variables globales que usarás más adelante
    currentPedidoId = parseInt(pedidoId);
    currentMesaNumero = numeroMesa;
    currentMesaId = buttonElement.getAttribute('data-mesa-id') || 1;

    try {
        // Consumimos tu endpoint existente de auditoría para jalar el JSON real del pedido
        const response = await fetch(`/admin/caja/api/pedido/${pedidoId}`);
        if (!response.ok) throw new Error("No se pudo obtener la estructura de la comanda");

        datosPedidoActualCaja = await response.json();

        // Seteamos el número de mesa en la cabecera del modal
        document.getElementById('lblMesaPrevisualizarCaja').innerText = numeroMesa;

        const contenedorPlatos = document.getElementById('listaPlatosPrevisualizarCaja');
        contenedorPlatos.innerHTML = ''; // Limpiamos registros previos

        if (datosPedidoActualCaja.detalles && datosPedidoActualCaja.detalles.length > 0) {
            datosPedidoActualCaja.detalles.forEach((d) => {
                // Omitimos platos mermados o cancelados
                if (d.canceladoPorCliente) return;

                // Creamos la fila del plato con el formato visual de La Jama
                const rowPlato = document.createElement('div');
                rowPlato.className = "d-flex align-items-center justify-content-between p-2 rounded-3";
                rowSimuladaEstilo = d.pagado ? "background-color: #f3f4f6; opacity: 0.6;" : "background-color: #fff; border: 1px solid rgba(27,58,44,0.1);";
                rowPlato.style = rowSimuladaEstilo;

                // Si el plato ya fue pagado en un ticket anterior, el checkbox sale desmarcado y deshabilitado
                const checkDisabled = d.pagado ? "disabled" : "";
                const checkChecked = d.pagado ? "" : "checked";
                const badgeEstado = d.pagado ? `<span class="badge bg-secondary">Pagado</span>` : `<span class="badge bg-success">En Mesa</span>`;

                rowPlato.innerHTML = `
                    <div class="d-flex align-items-center gap-2">
                        <input type="checkbox" class="chk-plato-caja-seleccion"
                               value="${d.id}" ${checkChecked} ${checkDisabled}
                               data-precio="${d.subtotal}"
                               style="width: 19px; height: 19px; cursor: pointer; accent-color: #1B3A2C;"
                               onchange="recalcularSubtotalModalCaja()">
                        <span class="fw-bold text-dark" style="font-size: 0.9rem;">${d.cantidad}x</span>
                        <span class="fw-semibold text-secondary" style="font-size: 0.9rem;">${d.producto.nombre}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="fw-bold" style="color: #1B3A2C; font-size: 0.9rem;">S/. ${d.subtotal.toFixed(2)}</span>
                        ${badgeEstado}
                    </div>
                `;
                contenedorPlatos.appendChild(rowPlato);
            });
        } else {
            contenedorPlatos.innerHTML = `<div class="text-muted text-center small py-3">No hay productos activos en esta comanda.</div>`;
        }

        // Ejecutamos el primer cálculo del subtotal con los que nacen checkeados
        recalcularSubtotalModalCaja();

        // 🌟 ABRIMOS ESTE MODAL INTERMEDIO NUEVO
        // Si usas el sistema de clases nativo de tu css/caja.css (como cambiarPestañaCaja o abrirModal), lo disparamos
        if (typeof abrirModal === 'function') {
            abrirModal('modalPrevisualizarCobroCaja');
        } else {
            document.getElementById('modalPrevisualizarCobroCaja').classList.add('activo');
        }

    } catch (error) {
        console.error("💥 Error al abrir previsualización de cobro:", error);
    }
}

function recalcularSubtotalModalCaja() {
    let sumaElegida = 0;
    let checkboxesMarcados = 0;

    document.querySelectorAll('.chk-plato-caja-seleccion:checked').forEach(chk => {
        sumaElegida += parseFloat(chk.getAttribute('data-precio')) || 0;
        checkboxesMarcados++;
    });

    document.getElementById('txtSubtotalElegidoCaja').innerText = sumaElegida.toFixed(2);

    // Si el cajero desmarca absolutamente todo, bloqueamos el botón de proceder
    const btnProceder = document.getElementById('btnProcederPasarelaCaja');
    if (btnProceder) {
        btnProceder.disabled = (checkboxesMarcados === 0);
        btnProceder.style.opacity = (checkboxesMarcados === 0) ? "0.5" : "1";
    }
}

function avanzarALaquidacionDinamica() {
    // 1. Cerramos el modal intermedio de selección
    if (typeof cerrarModalLocal === 'function') {
        cerrarModalLocal('modalPrevisualizarCobroCaja');
    } else {
        document.getElementById('modalPrevisualizarCobroCaja').classList.remove('activo');
    }

    // 2. Preparamos el contenedor fantasma que leerá caja-movil.js
    let listaPrevisualizarCaja = document.getElementById('lista-platos-previsualizar');
    if (!listaPrevisualizarCaja) {
        listaPrevisualizarCaja = document.createElement('div');
        listaPrevisualizarCaja.id = 'lista-platos-previsualizar';
        listaPrevisualizarCaja.style.display = 'none';
        document.body.appendChild(listaPrevisualizarCaja);
    }
    listaPrevisualizarCaja.innerHTML = ''; // Limpiamos

    platosDisponibles = [];
    platosSeleccionadosParaCobro = [];
    let totalConsumoCalculado = 0;
    let indexCobro = 0;

    // 3. Procesamos SÓLO los ítems que son elegibles para cobrar
    if (datosPedidoActualCaja && datosPedidoActualCaja.detalles) {
        datosPedidoActualCaja.detalles.forEach((d) => {
            // Ignoramos completamente lo que ya fue mermado o pagado anteriormente
            if (d.canceladoPorCliente || d.pagado) return;

            // Verificamos si el cajero dejó el check marcado en el modal intermedio
            const chk = document.querySelector(`.chk-plato-caja-seleccion[value="${d.id}"]`);
            const quiereCobrar = chk && chk.checked;

            // Inyectamos el nodo HTML oculto para el motor de caja-movil
            const rowSimulada = document.createElement('div');
            rowSimulada.setAttribute('data-estado', 'Entregado');
            rowSimulada.innerHTML = `
                <input type="checkbox" class="chk-mesa-confirmar" value="${d.id}" ${quiereCobrar ? 'checked' : ''}>
                <span class="badge bg-dark">${d.cantidad}x</span>
                <span class="fw-semibold">${d.producto.nombre}</span>
                <span class="text-muted small fw-bold">S/. ${d.subtotal.toFixed(2)}</span>
            `;
            listaPrevisualizarCaja.appendChild(rowSimulada);

            // Poblamos la matriz global
            platosDisponibles.push({
                id: indexCobro,
                productoId: d.producto.id, // Llave real para el backend
                nombre: d.producto.nombre,
                cantidad: d.cantidad,
                subtotal: d.subtotal,
                idTicketAsignado: -1,
                permitidoCobrar: true
            });

            if (quiereCobrar) {
                platosSeleccionadosParaCobro.push(indexCobro);
                totalConsumoCalculado += d.subtotal;
            }

            indexCobro++;
        });
    }

    totalConsumoMesa = Math.round(totalConsumoCalculado * 100) / 100;

    // 4. Inicializamos la pasarela nativa del sistema
    if (typeof inicializarFlujoCaja === 'function') {
        inicializarFlujoCaja(totalConsumoMesa, currentMesaNumero, 'BOLETA', '');
    }

    // 5. Mostramos la ventana final de cobro con métodos de pago y splits
    if (typeof facturacionModal !== 'undefined' && facturacionModal) {
        facturacionModal.show();
    } else {
        const bootstrapModal = new bootstrap.Modal(document.getElementById('modalFacturacion'));
        bootstrapModal.show();
    }
}