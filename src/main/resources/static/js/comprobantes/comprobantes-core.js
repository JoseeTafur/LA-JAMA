/**
 * 💼 LA JAMA - MOTOR CORE (comprobantes-core.js)
 * Lógica de Emisión, Timbrado, Anulación y Refacturación (SUNAT)
 */

let detallesPedidoEdicionBuffer = [];

function capturarYTimbrar(boton) {
    const idPedido = boton.getAttribute('data-id');
    const preferencia = boton.getAttribute('data-preferencia');
    const documento = boton.getAttribute('data-documento');

    const fila = boton.closest('tr');
    let notaFormateada = `NV-${idPedido}`;
    if (fila && fila.cells[0]) {
        notaFormateada = fila.cells[0].textContent.trim();
    }

    abrirPanelTimbrado(idPedido, preferencia, documento, notaFormateada);
}

async function abrirPanelTimbrado(idPedido, preferencia, documento, notaFormateada) {
    const docLimpio = documento && documento !== 'null' ? documento : 'SIN DOCUMENTO';
    const tipoDocSolicitado = preferencia ? preferencia.toUpperCase() : 'BOLETA';

    const { value: confirmacion } = await Swal.fire({
        title: '<span style="color: #1B3A2C; font-weight: 800;">Emitir Comprobante</span>',
        html: `¿Desea transformar la Nota de Venta <strong style="color: #933D2D;">${notaFormateada}</strong> en un comprobante válido ante la SUNAT?<br><br>
               <div style="text-align: left; font-size: 0.85rem; background: #FFF7ED; padding: 10px; border-radius: 8px; border: 1px dashed #ffedd5;">
                   • <strong>Tipo Solicitado:</strong> ${tipoDocSolicitado}<br>
                   • <strong>Documento Cliente:</strong> ${docLimpio}
               </div>`,
        icon: 'info',
        background: '#FFF7ED',
        showCancelButton: true,
        confirmButtonColor: '#1B3A2C',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, Timbrar Ahora',
        cancelButtonText: 'Cancelar'
    });

    if (confirmacion) {
        Swal.fire({
            title: 'Conectando con miapi.cloud...',
            text: 'Enviando estructura XML firmada a los servidores de SUNAT.',
            background: '#FFF7ED',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const res = await fetch(`/admin/pedido/aprobar?idPedido=${idPedido}`, { method: 'POST' });
            const data = await res.json();

            if (res.ok && data.success) {
                await Swal.fire({ icon: 'success', title: '¡Timbrado Exitoso!', text: data.message, confirmButtonColor: '#1B3A2C' });
                window.location.reload();
            } else {
                Swal.fire({ icon: 'error', title: '🚨 Falla en Homologación', text: data.message || 'El CPE fue rechazado.', confirmButtonColor: '#933D2D' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: '💥 Falla de Red', text: 'No se pudo conectar con el microservicio de facturación.', confirmButtonColor: '#933D2D' });
        }
    }
}

function verTicketTermico(pedidoId) {
    console.log(`🖨️ [La Jama] Despachando comando de impresión para la Nota de Venta #${pedidoId}`);
    const urlTicket = `/admin/caja/ticket-venta/${pedidoId}`;
    const ventanaImpresion = window.open(urlTicket, '_blank', 'width=400,height=600,top=100,left=100,menubar=no,toolbar=no,location=no,status=no');

    if (ventanaImpresion) {
        ventanaImpresion.focus();
    } else {
        Swal.fire({
            icon: 'warning',
            title: 'Pop-up Bloqueado',
            text: 'Por favor, permite las ventanas emergentes en tu navegador para que se abra la orden de impresión térmica automáticamente.',
            confirmButtonColor: '#1B3A2C'
        });
    }
}

async function capturarYAnular(boton) {
    const idPedido = boton.getAttribute('data-id');
    const cpeNumero = boton.getAttribute('data-cpe');

    const { value: formValues } = await Swal.fire({
        title: '<span style="color: #933D2D; font-weight: 800;">¿Anular Comprobante?</span>',
        html: `¿Está seguro de dar de baja total el documento <strong style="color: #1B3A2C;">${cpeNumero}</strong>?<br><br>
               <div style="text-align: left; font-size: 0.85rem;">
                   <label class="fw-bold mb-1 text-dark">Seleccione el Motivo:</label>
                   <select id="swal-motivo" class="form-select form-select-sm mb-3">
                       <option value="OPERACION_ANULADA" selected>Operación anulada o cancelada</option>
                       <option value="ERROR_CLIENTE">Error en los datos del cliente</option>
                       <option value="ERROR_PRODUCTOS">Error en los productos o cantidades</option>
                   </select>
                   <label class="fw-bold mb-1 text-dark">Sustento / Descripción obligatoria:</label>
                   <textarea id="swal-sustento" class="form-control form-control-sm" rows="2" placeholder="Justificación para SUNAT..."></textarea>
               </div>`,
        icon: 'warning',
        background: '#FFF7ED',
        showCancelButton: true,
        confirmButtonColor: '#933D2D',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, Anular Totalmente',
        cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const motivo = document.getElementById('swal-motivo').value;
            const sustento = document.getElementById('swal-sustento').value.trim();
            if (!sustento) { Swal.showValidationMessage('Ingrese un sustento explicativo.'); return false; }
            return { motivo: motivo, sustento: sustento };
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Procesando Nota de Crédito...', text: 'Comunicando la baja a miapi.cloud.', background: '#FFF7ED', allowOutsideClick: false, showConfirmButton: false, didOpen: () => { Swal.showLoading(); } });
        const payload = { pedidoId: idPedido, motivo: formValues.motivo, tipoNota: 'TOTAL', sustento: formValues.sustento, generarNuevoComprobante: 'NO' };
        try {
            const response = await fetch('/admin/comprobantes/api/pedido/procesar-anulacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await response.json();
            if (data.success) {
                await Swal.fire({ icon: 'success', title: '¡Anulado!', text: 'El documento fue revertido con éxito.', confirmButtonColor: '#1B3A2C' });
                window.location.reload();
            } else { Swal.fire({ icon: 'error', title: 'Error Operativo', text: data.message, confirmButtonColor: '#933D2D' }); }
        } catch (error) { Swal.fire({ icon: 'error', title: 'Error Crítico', text: 'No se pudo conectar con el servidor de auditoría.', confirmButtonColor: '#933D2D' }); }
    }
}

async function abrirEditorReemision(pedidoId) {
    detallesPedidoEdicionBuffer = [];
    const contenedor = document.getElementById('reemision-contenedor-platos');
    contenedor.innerHTML = `<div class="text-center py-4"><div class="spinner-border spinner-border-sm text-success"></div></div>`;

    let modalBootstrap = bootstrap.Modal.getInstance(document.getElementById('modalEdicionReemision')) || new bootstrap.Modal(document.getElementById('modalEdicionReemision'));
    modalBootstrap.show();

    try {
        const response = await fetch(`/admin/caja/api/pedido/${pedidoId}`);
        const data = await response.json();
        document.getElementById('reemision-pedido-id').value = data.id;
        document.getElementById('reemision-nv-origen').innerText = `NV-${data.id}`;

        // 🔥 VALIDACIÓN DE NOMBRE SOLICITADA: Si no hay cliente o es un string automático de mesa, forzamos "Cliente General"
        const nombreOriginal = data.cliente || '';
        if (!nombreOriginal || nombreOriginal.trim() === '' || nombreOriginal.toUpperCase().includes("MESA")) {
            document.getElementById('reemision-cliente-nombre').value = "Cliente General";
        } else {
            document.getElementById('reemision-cliente-nombre').value = nombreOriginal;
        }

        const doc = data.documentoCliente;
        document.getElementById('reemision-cliente-doc').value = (doc && doc !== 'null' && doc !== 'SIN DOCUMENTO') ? doc : '';
        document.getElementById('reemision-cpe-tipo').value = data.comprobanteTipo || 'BOLETA';
        document.getElementById('reemision-cpe-medio').value = data.metodoPago || 'EFECTIVO';

        detallesPedidoEdicionBuffer = data.detalles;
        rebuildListaPlatosReemision();
    } catch (error) {
        contenedor.innerHTML = `<p class="text-danger small text-center py-3">⚠️ Error al leer la orden.</p>`;
    }
}

async function procesarTimbradoCorregido() {
    const pedidoId = document.getElementById('reemision-pedido-id').value;
    const nuevoCliente = document.getElementById('reemision-cliente-nombre').value.trim();
    const nuevoDoc = document.getElementById('reemision-cliente-doc').value.trim();
    const nuevoTipoCpe = document.getElementById('reemision-cpe-tipo').value;
    const nuevoMetodo = document.getElementById('reemision-cpe-medio').value;
    const nuevoCorreo = document.getElementById('reemision-cliente-correo')?.value.trim() || '';

    if (!nuevoCliente) {
        Swal.fire({ icon: 'warning', title: 'Campo Requerido', text: 'Por favor, asigne un nombre de Cliente.', confirmButtonColor: '#d97706' });
        return;
    }

    if (nuevoTipoCpe === 'FACTURA' && nuevoDoc.length !== 11) {
        Swal.fire({ icon: 'warning', title: 'Validación Fiscal', text: 'Las facturas exigen un RUC válido de 11 dígitos.', confirmButtonColor: '#d97706' });
        return;
    }

    // Mapeamos los ítems modificados del buffer para el payload
    const detallesModificados = detallesPedidoEdicionBuffer.map(item => ({
        id: item.id,
        cantidad: item.cantidad
    }));

    const payload = {
        pedidoId: pedidoId,
        clienteNombre: nuevoCliente,
        documento: nuevoDoc,
        comprobanteTipo: nuevoTipoCpe,
        metodoPago: nuevoMetodo,
        clienteCorreo: nuevoCorreo,
        detallesModificados: detallesModificados
    };

    Swal.fire({
        title: 'Emitiendo Comprobante Corregido...',
        text: 'Comunicando la re-emisión a los servidores de SUNAT.',
        background: '#FFF7ED',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await fetch('/admin/comprobantes/api/pedido/reemitir-corregido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (response.ok && data.success) {
            let modalElement = document.getElementById('modalEdicionReemision');
            if (modalElement) {
                let modalBootstrap = bootstrap.Modal.getInstance(modalElement);
                if (modalBootstrap) modalBootstrap.hide();
            }

            await Swal.fire({ icon: 'success', title: '¡Re-emisión Exitosa!', text: data.message, confirmButtonColor: '#1B3A2C' });
            window.location.reload();
        } else {
            Swal.fire({ icon: 'error', title: 'Rechazo de SUNAT', text: data.message, confirmButtonColor: '#933D2D' });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error Crítico', text: 'No se pudo conectar con el microservicio de refacturación.', confirmButtonColor: '#933D2D' });
    }
}

function rebuildListaPlatosReemision() {
    const contenedor = document.getElementById('reemision-contenedor-platos');
    let htmlRows = ''; let totalComprobante = 0;
    detallesPedidoEdicionBuffer.forEach((item, index) => {
        if (!item.canceladoPorCliente) {
            if (!item.precioUnitarioBase) {
                item.precioUnitarioBase = item.subtotalInicial ? (item.subtotalInicial / item.cantidadInicial) : (item.subtotal / (item.cantidad || 1));
                item.cantidadInicial = item.cantidad; item.subtotalInicial = item.subtotal;
            }
            const esEliminado = item.cantidad === 0; totalComprobante += item.subtotal;
            htmlRows += `
                <div class="d-flex align-items-center justify-content-between p-2 mb-2 border rounded ${esEliminado ? 'bg-light-danger opacity-50' : 'bg-light'}" style="font-size: 0.85rem;">
                    <div style="max-width: 55%;"><strong class="${esEliminado ? 'text-decoration-line-through text-muted' : 'text-dark'} d-block">${item.producto.nombre}</strong><span class="text-muted small">Precio U: S/ ${item.precioUnitarioBase.toFixed(2)}</span></div>
                    <div class="d-flex align-items-center gap-2">
                        <label class="small text-muted m-0">Cant:</label>
                        <input type="number" class="form-control form-control-sm text-center fw-bold text-secondary" value="${item.cantidad}" min="0" max="99" style="width: 55px; padding: 2px;" ${esEliminado ? 'disabled' : ''} onchange="window.alterarCantidadReemision(${index}, this.value)" />
                        <span class="fw-bold text-jama-gold text-end ms-2" style="width: 80px;">S/ ${item.subtotal.toFixed(2)}</span>
                        <button type="button" class="btn btn-sm p-1 border-0" onclick="window.alternarEliminacionItem(${index})">${esEliminado ? '➕' : '❌'}</button>
                    </div>
                </div>`;
        }
    });
    contenedor.innerHTML = htmlRows || '<p class="text-muted small text-center py-3">Sin ítems activos</p>';
    const baseGravada = totalComprobante / 1.18; const igv = totalComprobante - baseGravada;
    if (document.getElementById('resumen-gravada')) document.getElementById('resumen-gravada').innerText = `S/ ${baseGravada.toFixed(2)}`;
    if (document.getElementById('resumen-igv')) document.getElementById('resumen-igv').innerText = `S/ ${igv.toFixed(2)}`;
    document.getElementById('reemision-monto-total').innerText = `S/ ${totalComprobante.toFixed(2)}`;
    if (document.getElementById('reemision-texto-letras')) document.getElementById('reemision-texto-letras').innerText = `SON: ${numeroALetras(totalComprobante)} SOLES`;
}

function alterarCantidadReemision(index, nuevaCantidad) {
    let cantidad = parseInt(nuevaCantidad); if (isNaN(cantidad) || cantidad < 0) cantidad = 0;
    const item = detallesPedidoEdicionBuffer[index]; item.cantidad = cantidad; item.subtotal = cantidad * item.precioUnitarioBase;
    rebuildListaPlatosReemision();
}

function alternarEliminacionItem(index) {
    const item = detallesPedidoEdicionBuffer[index];
    if (item.cantidad > 0) { item.cantidadAnterior = item.cantidad; item.cantidad = 0; item.subtotal = 0; }
    else { item.cantidad = item.cantidadAnterior || item.cantidadInicial || 1; item.subtotal = item.cantidad * item.precioUnitarioBase; }
    rebuildListaPlatosReemision();
}

function numeroALetras(numero) {
    const deman = Math.floor(numero); const centavos = Math.round((numero - deman) * 100);
    return `${deman.toString().toUpperCase()} CON ${centavos.toString().padStart(2, '0')}/100`;
}

function exportarReporteComprobantesOficial(formato) {
    const tabActivo = document.querySelector('#comprobantesTabs .nav-link.active').id;
    let pestañaParam = 'PENDIENTES';

    if (tabActivo === 'emitidos-tab') pestañaParam = 'EMITIDOS';
    else if (tabActivo === 'anulados-tab') pestañaParam = 'ANULADOS';

    // Capturamos los mismos filtros que el usuario aplicó en la grilla visual
    const texto = document.getElementById('filtroCpeTexto').value.trim();
    const metodo = document.getElementById('filtroCpeMetodo').value;
    const origen = document.getElementById('filtroCpeOrigen').value;
    const inicio = document.getElementById('filtroCpeFechaInicio').value;
    const fin = document.getElementById('filtroCpeFechaFin').value;

    // Estructuramos la URL final inyectándole la matriz exacta de filtrado cruzado
    let urlDestino = `/admin/reportes/comprobantes/${pestañaParam}/${formato.toLowerCase()}`;
    urlDestino += `?inicio=${inicio}&fin=${fin}&texto=${encodeURIComponent(texto)}&metodo=${metodo}&origen=${origen}`;

    // Despachamos la descarga binaria segura
    window.location.href = urlDestino;
}

document.addEventListener('DOMContentLoaded', function () {
    const contenedorTabs = document.getElementById('comprobantesTabs');
    if (contenedorTabs) {
        contenedorTabs.addEventListener('shown.bs.tab', function () {
            console.log("🔄 [La Jama Control] Pestaña cambiada. Reevaluando aduana de exportación...");
            if (typeof actualizarMensajesVacios === 'function') {
                actualizarMensajesVacios();
            }
        });
    }
    // Forzamos un disparo inicial al cargar la interfaz para congelar los botones de arranque
    setTimeout(actualizarMensajesVacios, 150);
});

// ── CARDADO DE COMPORTAMIENTO Y VALIDACIONES DINÁMICAS ──
document.addEventListener('DOMContentLoaded', function () {
    const selectorTipoCpe = document.getElementById('reemision-cpe-tipo');
    const inputDoc = document.getElementById('reemision-cliente-doc');

    if (selectorTipoCpe && inputDoc) {
        // Evento que vigila el cambio de tipo de documento
        selectorTipoCpe.addEventListener('change', function () {
            inputDoc.value = '';
            document.getElementById('reemision-cliente-nombre').value = 'Cliente General';
            configurarMascaraDocumento();
        });

        // Evento que restringe caracteres no numéricos y limita longitud en tiempo real
        inputDoc.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, ''); // Solo números enteros

            const maxDigitos = selectorTipoCpe.value === 'FACTURA' ? 11 : 8;
            if (this.value.length > maxDigitos) {
                this.value = this.value.slice(0, maxDigitos);
            }

            // 🚀 AUTO-DISPARO AUTOMÁTICO: Si llega a la cantidad exacta de dígitos, consulta sola
            if (this.value.length === maxDigitos) {
                consultarPadronOficialLaJama();
            }
        });
    }
});

function configurarMascaraDocumento() {
    const selectorTipoCpe = document.getElementById('reemision-cpe-tipo').value;
    const inputDoc = document.getElementById('reemision-cliente-doc');
    if (!inputDoc) return;

    if (selectorTipoCpe === 'FACTURA') {
        inputDoc.placeholder = "RUC Requerido (11 dígitos)";
        inputDoc.setAttribute('maxlength', '11');
    } else {
        inputDoc.placeholder = "DNI Opcional (8 dígitos)";
        inputDoc.setAttribute('maxlength', '8');
    }
}

// ── CONSULTA EN TIEMPO REAL A TU REPO DE SPRING BOOT ──
async function consultarPadronOficialLaJama() {
    const tipoCpe = document.getElementById('reemision-cpe-tipo').value;
    const numDoc = document.getElementById('reemision-cliente-doc').value.trim();
    const txtNombre = document.getElementById('reemision-cliente-nombre');
    const spinner = document.getElementById('spinner-busqueda-oficial');
    const btnBuscar = document.getElementById('btn-consultar-padron');

    const longEsperada = tipoCpe === 'FACTURA' ? 11 : 8;

    if (numDoc.length !== longEsperada) {
        return; // Detiene el flujo si faltan dígitos
    }

    // Activamos estados de carga en la UI de La Jama
    if (spinner) spinner.style.display = 'inline-block';
    if (btnBuscar) btnBuscar.disabled = true;
    txtNombre.value = "Consultando padrón oficial...";

    const endpoint = tipoCpe === 'FACTURA' ? `/api/documentos/ruc/${numDoc}` : `/api/documentos/dni/${numDoc}`;

    try {
        const response = await fetch(endpoint);
        const rawData = await response.json();

        // 🛡️ ESCUDO DE DESERIALIZACIÓN: miapi.cloud a veces envía los campos limpios o dentro de un nodo "respuesta"
        const data = rawData.respuesta ? rawData.respuesta : rawData;

        if (response.ok && !data.error) {
            if (tipoCpe === 'FACTURA') {
                // Mapeo exhaustivo multi-propiedad para RUC (captura cualquier variante del JSON externo)
                const razonSocialDetectada = data.razonSocial || data.razon_social || data.nombre || data.nombre_comercial || "";

                if (razonSocialDetectada && razonSocialDetectada.trim() !== "") {
                    txtNombre.value = razonSocialDetectada.toUpperCase().trim();
                } else {
                    txtNombre.value = "Cliente General";
                }

                // Auto-relleno dinámico de la dirección fiscal si viene en la metadata
                const direccionDetectada = data.direccion || data.direccion_fiscal || data.direccionFiscal || "";
                if (direccionDetectada) {
                    const inputDir = document.getElementById('reemision-cliente-dir');
                    if (inputDir) inputDir.value = direccionDetectada.toUpperCase().trim();
                }
            } else {
                // Mapeo exhaustivo multi-propiedad para DNI (Nombres + Apellidos separados o combinados)
                let nombreCompleto = "";

                if (data.nombres || data.apellidoPaterno || data.apellidoMaterno) {
                    nombreCompleto = `${data.nombres || ''} ${data.apellidoPaterno || ''} ${data.apellidoMaterno || ''}`;
                } else {
                    nombreCompleto = data.nombre || data.nombreCompleto || data.nombre_completo || "";
                }

                if (nombreCompleto && nombreCompleto.trim() !== "") {
                    txtNombre.value = nombreCompleto.replace(/\s+/g, ' ').toUpperCase().trim();
                } else {
                    txtNombre.value = "Cliente General";
                }
            }
        } else {
            txtNombre.value = "Cliente General";
        }
    } catch (err) {
        console.error("🚨 Falla crítica de comunicación en pasarela de documentos:", err);
        txtNombre.value = "Cliente General";
    } finally {
        // Restauramos los controles de la interfaz
        if (spinner) spinner.style.display = 'none';
        if (btnBuscar) btnBuscar.disabled = false;
    }
}

window.consultarPadronOficialLaJama = consultarPadronOficialLaJama;
window.configurarMascaraDocumento = configurarMascaraDocumento;
window.capturarYTimbrar = capturarYTimbrar;
window.verTicketTermico = verTicketTermico;
window.capturarYAnular = capturarYAnular;
window.abrirEditorReemision = abrirEditorReemision;
window.alterarCantidadReemision = alterarCantidadReemision;
window.alternarEliminacionItem = alternarEliminacionItem;
window.exportarReporteComprobantesOficial = exportarReporteComprobantesOficial;
window.procesarTimbradoCorregido = procesarTimbradoCorregido;