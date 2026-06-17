// =========================================================================
// ENRUTAMIENTO DINÁMICO Y AUDITORÍA EN VIVO PARA LA CAJA (LA JAMA)
// =========================================================================
let selectedPedidoId = null;
let paginaActual = 1;
const registrosPorPagina = 8;

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