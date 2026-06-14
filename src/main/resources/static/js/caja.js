// =======================================================
// ENRUTAMIENTO DINÁMICO Y AUDITORÍA EN VIVO PARA LA CAJA (LA JAMA)
// =======================================================
let selectedPedidoId = null;

// ── Helpers nativos de apertura y cierre de modales (Reemplazo de Bootstrap) ──
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
                // Evaluamos contra la clase específica del pedido para no alterar otros elementos
                if(fila.classList.contains('fila-pedido-caja')) {
                    fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
                }
            });
            // Cada vez que se busca, recalculamos la paginación local sobre los elementos visibles
            inicializarPaginacionLocal();
        });
    }

    // Ejecución inicial de paginación
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
            document.getElementById('auditoriaIdPedido').innerText = data.id;
            document.getElementById('auditoriaTipo').innerText = data.tipoPedido;
            document.getElementById('auditoriaMesa').innerText = data.numeroMesa || "N/A";
            document.getElementById('auditoriaTotal').innerText = data.montoTotal.toFixed(2);

            const lista = document.getElementById('auditoriaListaPlatos');
            lista.innerHTML = "";
            data.detalles.forEach(d => {
                if (d.canceladoPorCliente) return;
                lista.innerHTML += `
                    <div class="jama-detalle-item">
                        <span class="detalle-qty">${d.cantidad}x</span>
                        <span class="detalle-nombre">${d.producto.nombre}</span>
                        <span class="detalle-monto">S/. ${d.subtotal.toFixed(2)}</span>
                    </div>`;
            });
            abrirModal('modalDetalleAuditoria');
        })
        .catch(() => {
            AppUtils.showLoading(false);
            AppUtils.showNotification("Error al cargar la comanda", "error");
        });
}

// ── Control de Emisión CPE ─────────────────────────────────────────────
function abrirModalFiscalUnificado(pedidoId, tipoOriginal, documentoOriginal = '', esModificable = false) {
    document.getElementById('fiscalPedidoId').value = pedidoId;
    document.getElementById('fiscalIdOrdenTexto').innerText = pedidoId;

    const tipoSeguro = (tipoOriginal && tipoOriginal !== 'null' && tipoOriginal !== '') ? tipoOriginal.toUpperCase() : 'BOLETA';
    const docSeguro = (documentoOriginal && documentoOriginal !== 'null' && documentoOriginal !== 'undefined') ? documentoOriginal : '';

    const inputDoc = document.getElementById('fiscalInputDoc');
    inputDoc.value = docSeguro;
    inputDoc.readOnly = !esModificable;

    if (!esModificable) {
        inputDoc.style.backgroundColor = "var(--caja-skin)";
    } else {
        inputDoc.style.backgroundColor = "var(--caja-white)";
    }

    cambiarTipoEnModal(tipoSeguro, esModificable);
    abrirModal('modalEmisionFiscal');
}

function cambiarTipoEnModal(tipo, esModificable = false) {
    document.getElementById('fiscalTipoDoc').value = tipo;

    const btnBoleta = document.getElementById('btnPasoBoleta');
    const btnFactura = document.getElementById('btnPasoFactura');
    const labelDoc = document.getElementById('labelDocumentoFiscal');
    const inputDoc = document.getElementById('fiscalInputDoc');

    btnBoleta.disabled = !esModificable;
    btnFactura.disabled = !esModificable;

    if (tipo === 'FACTURA') {
        btnFactura.className = "jama-btn-selector activo";
        btnBoleta.className = "jama-btn-selector";
        labelDoc.innerText = esModificable ? "Paso 2: Corregir RUC de la Empresa (11 dígitos) *" : "Paso 2: RUC de la Empresa (Validado en Mesa)";
        inputDoc.placeholder = "Ingrese RUC corporativo";
    } else {
        btnBoleta.className = "jama-btn-selector activo";
        btnFactura.className = "jama-btn-selector";
        labelDoc.innerText = esModificable ? "Paso 2: Corregir DNI / Identificación *" : "Paso 2: DNI del Cliente (Asignado en Mesa)";
        inputDoc.placeholder = "Clientes Varios / DNI";
    }
}

// ── Notas de Crédito / Bajas Asíncronas ─────────────────────────────────
async function anularYCorregirComprobante(pedidoId, tipoActual, documentoActual) {
    AppUtils.showConfirmationDialog({
        title: '⚠️ ¿Anular Comprobante Emitido?',
        text: `Se generará una Nota de Crédito para la Orden #${pedidoId}. Esto liberará la comanda para cambiar el tipo de documento o corregir datos inmediatamente.`,
        icon: 'warning',
        confirmButtonColor: 'var(--caja-danger)',
        confirmButtonText: 'Sí, Anular y Corregir'
    }, async function() {
        AppUtils.showLoading(true);
        try {
            const res = await fetch(`/admin/caja/anular-comprobante?pedidoId=${pedidoId}`);
            AppUtils.showLoading(false);

            if (res.redirected || res.ok) {
                AppUtils.showNotification("Comprobante anulado. Preparando entorno de reemisión...", "warning");
                setTimeout(() => { window.location.reload(); }, 3000);
            } else {
                AppUtils.showNotification("El servidor rechazó la solicitud de anulación.", "error");
            }
        } catch (error) {
            AppUtils.showLoading(false);
            AppUtils.showNotification("Fallo crítico al conectar con el módulo de notas de crédito.", "error");
        }
    });
}

function prepararModalDesdeTabla(btn, esModificable) {
    const id = btn.getAttribute('data-id');
    const tipo = btn.getAttribute('data-tipo');
    const doc = String(btn.getAttribute('data-doc') || '').trim();
    abrirModalFiscalUnificado(id, tipo, doc, esModificable);
}

function prepararAnulacionDesdeTabla(btn) {
    const id = btn.getAttribute('data-id');
    const tipo = btn.getAttribute('data-tipo');
    const doc = btn.getAttribute('data-doc');
    anularYCorregirComprobante(id, tipo, doc);
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

// ── Motor de Paginación Local Integrado ────────────────────────────────
let paginaActual = 1;
const registrosPorPagina = 8;

function inicializarPaginacionLocal() {
    const tabla = document.getElementById('tablaCaja');
    if (!tabla) {
            const info = document.getElementById('pagStart');
            // Si tienes textos informativos de paginación fuera, los reseteamos a 0
            if (info) {
                document.getElementById('pagStart').innerText = "0";
                document.getElementById('pagEnd').innerText = "0";
            }
            return;
        }

    // Capturamos las filas de comandas exclusivamente
    const filas = Array.from(tabla.querySelectorAll('tbody tr.fila-pedido-caja'));

    // Filtramos solo las que pasaron la prueba del buscador (es decir, display != none de forma previa)
    const filasVisibles = filas.filter(f => f.style.getPropertyValue('display') !== 'none');

    const totalRegistros = filasVisibles.length;
    const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina) || 1;

    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    // Ocultamos temporalmente todas las filas base
    filas.forEach(f => f.style.setProperty('display', 'none', 'important'));

    // Calculamos índices límites
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = Math.min(inicio + registrosPorPagina, totalRegistros);

    // Encendemos solo las del rango activo
    for (let i = inicio; i < fin; i++) {
        if (filasVisibles[i]) {
            filasVisibles[i].style.removeProperty('display');
        }
    }

    // Actualizamos textos informativos
    document.getElementById('pagStart').innerText = totalRegistros === 0 ? 0 : inicio + 1;
    document.getElementById('pagEnd').innerText = fin;

    // Dibujamos botones numéricos de forma interactiva
    const contenedorPaginas = document.getElementById('contenedorPaginas');
    if (contenedorPaginas) {
        contenedorPaginas.innerHTML = "";
        for (let p = 1; p <= totalPaginas; p++) {
            contenedorPaginas.innerHTML += `<span class="pag-numero ${p === paginaActual ? 'activo' : ''}" onclick="irAPaginaLocal(${p})">${p}</span>`;
        }
    }

    // Vinculamos acciones a los botones Previo / Siguiente
    const btnAnt = document.getElementById('btnPagAnterior');
    const btnSig = document.getElementById('btnPagSiguiente');

    if (btnAnt) {
        btnAnt.onclick = () => { if (paginaActual > 1) { paginaActual--; inicializarPaginacionLocal(); } };
    }
    if (btnSig) {
        btnSig.onclick = () => { if (paginaActual < totalPaginas) { paginaActual++; inicializarPaginacionLocal(); } };
    }
}

function irAPaginaLocal(numeroPagina) {
    paginaActual = numeroPagina;
    inicializarPaginacionLocal();
}