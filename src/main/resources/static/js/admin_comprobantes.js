/**
 * 📊 MOTOR CONTABLE: GESTIÓN DE COMPROBANTES Y TIMBRADO OPTIMIZADO (LA JAMA)
 */

// Buffer en memoria de la orden seleccionada para cálculos en caliente
let detallesPedidoEdicionBuffer = [];

/**
 * 🚀 EMISIÓN / TIMBRADO DE COMPROBANTES ELECTRÓNICOS ACTIVOS
 */
function capturarYTimbrar(boton) {
    const idPedido = boton.getAttribute('data-id');
    const preferencia = boton.getAttribute('data-preferencia');
    const documento = boton.getAttribute('data-documento');

    abrirPanelTimbrado(idPedido, preferencia, documento);
}

async function abrirPanelTimbrado(idPedido, preferencia, documento) {
    const docLimpio = documento && documento !== 'null' ? documento : 'SIN DOCUMENTO';
    const tipoDocSolicitado = preferencia ? preferencia.toUpperCase() : 'BOLETA';

    const { value: confirmacion } = await Swal.fire({
        title: '<span style="color: #1B3A2C; font-weight: 800;">Emitir Comprobante Electrónico</span>',
        html: `¿Desea transformar la Nota de Venta <strong style="color: #933D2D;">NV-${idPedido}</strong> en un comprobante válido ante la SUNAT?<br><br>
               <div style="text-align: left; font-size: 0.85rem; background: #FFF7ED; padding: 10px; border-radius: 8px; border: 1px dashed var(--lajama-peach);">
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
                if (typeof apputil !== 'undefined' && apputil.mostrarMensaje) {
                    Swal.close();
                    apputil.mostrarMensaje("¡Timbrado Exitoso!", data.message, "success");
                } else {
                    await Swal.fire({ icon: 'success', title: '¡Timbrado Exitoso!', text: data.message, confirmButtonColor: '#1B3A2C' });
                }
                window.location.reload();
            } else {
                Swal.fire({ icon: 'error', title: '🚨 Falla en Homologación SUNAT', text: data.message || 'El CPE fue rechazado.', confirmButtonColor: '#933D2D' });
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: '💥 Falla de Red', text: 'No se pudo conectar con el microservicio de facturación.', confirmButtonColor: '#933D2D' });
        }
    }
}

function verTicketTermico(pedidoId) {

    // Construimos la ruta exacta apuntando al motor del ticket de venta que renderiza en 80mm
    const urlTicket = `/admin/caja/ticket-venta/${pedidoId}`;

    // Abrimos una ventana emergente limpia dimensionada para formato de ticketera térmica
    const ventanaImpresion = window.open(urlTicket, '_blank', 'width=400,height=600,top=100,left=100,menubar=no,toolbar=no,location=no,status=no');

    if (ventanaImpresion) {
        // Forzamos el foco en la ventana del ticket para que el cajero proceda de inmediato
        ventanaImpresion.focus();
    } else {
        // Failsafe por si el navegador bloquea las ventanas emergentes automáticas
        Swal.fire({
            icon: 'warning',
            title: 'Pop-up Bloqueado',
            text: 'Por favor, permite las ventanas emergentes en tu navegador para que se abra la orden de impresión térmica automáticamente.',
            confirmButtonColor: '#1B3A2C'
        });
    }
}

/**
 * 📑 AUDITORÍA: ANULACIÓN TOTAL DIRECTA CON CONFIRMACIÓN (SWEETALERT2)
 */
async function capturarYAnular(boton) {
    const idPedido = boton.getAttribute('data-id');
    const cpeNumero = boton.getAttribute('data-cpe');

    const { value: formValues } = await Swal.fire({
        title: '<span style="color: #933D2D; font-weight: 800;">¿Anular Comprobante?</span>',
        html: `¿Está seguro de dar de baja total el documento <strong style="color: #1B3A2C;">${cpeNumero}</strong>?<br><br>
               <div style="text-align: left; font-size: 0.85rem;">
                   <label class="fw-bold mb-1 text-dark">Seleccione el Motivo Comercial:</label>
                   <select id="swal-motivo" class="form-select form-select-sm mb-3">
                       <option value="OPERACION_ANULADA" selected>Operación anulada o cancelada</option>
                       <option value="ERROR_CLIENTE">Error en los datos del cliente</option>
                       <option value="ERROR_PRODUCTOS">Error en los productos o cantidades</option>
                       <option value="DUPLICADO">Comprobante emitido por duplicado</option>
                       <option value="DEVOLUCION">Devolución de compra</option>
                   </select>

                   <label class="fw-bold mb-1 text-dark">Sustento / Descripción obligatoria:</label>
                   <textarea id="swal-sustento" class="form-control form-control-sm" rows="2" placeholder="Justificación legal para SUNAT..."></textarea>
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

            if (!sustento) {
                Swal.showValidationMessage('Por favor, ingrese un sustento explicativo para la baja.');
                return false;
            }
            return { motivo: motivo, sustento: sustento };
        }
    });

    if (formValues) {
        Swal.fire({
            title: 'Procesando Nota de Crédito...',
            text: 'Comunicando la baja estructural a miapi.cloud.',
            background: '#FFF7ED',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const payload = {
            pedidoId: idPedido,
            motivo: formValues.motivo,
            tipoNota: 'TOTAL',
            sustento: formValues.sustento,
            generarNuevoComprobante: 'NO'
        };

        try {
            const response = await fetch('/admin/comprobantes/api/pedido/procesar-anulacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Servidor respondió con estado ${response.status}`);
            const data = await response.json();

            if (data.success) {
                if (typeof apputil !== 'undefined' && apputil.mostrarMensaje) {
                    Swal.close();
                    apputil.mostrarMensaje("¡Anulado!", "Comprobante dado de baja correctamente.", "success");
                } else {
                    await Swal.fire({ icon: 'success', title: '¡Anulado!', text: 'El documento fue revertido con éxito.', confirmButtonColor: '#1B3A2C' });
                }
                window.location.reload();
            } else {
                Swal.fire({ icon: 'error', title: 'Error Operativo', text: data.message, confirmButtonColor: '#933D2D' });
            }
        } catch (error) {
            console.error("Error en flujo de anulación:", error);
            Swal.fire({ icon: 'error', title: 'Error Crítico', text: 'No se pudo conectar con el servidor de auditoría.', confirmButtonColor: '#933D2D' });
        }
    }
}

/**
 * 📥 PRECARGA Y APERTURA COMPLETA CON CONTROL FISCAL DE RE-EMISIÓN
 */
async function abrirEditorReemision(pedidoId) {
    detallesPedidoEdicionBuffer = [];
    const contenedor = document.getElementById('reemision-contenedor-platos');

    contenedor.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border spinner-border-sm text-success" role="status"></div>
            <span class="small text-muted ms-2">Estructurando ticket original...</span>
        </div>`;

    const modalBootstrap = new bootstrap.Modal(document.getElementById('modalEdicionReemision'));
    modalBootstrap.show();

    try {
        const response = await fetch(`/admin/caja/api/pedido/${pedidoId}`);
        if (!response.ok) throw new Error("No se pudo obtener la orden.");
        const data = await response.json();

        // 1. Poblamos metadatos de cabecera y datos del cliente receptor
        document.getElementById('reemision-pedido-id').value = data.id;
        document.getElementById('reemision-nv-origen').innerText = `NV-${data.id}`;

        document.getElementById('reemision-cliente-nombre').value = data.cliente || `Mesa #${data.numeroMesa || ''}`;

        const doc = data.documentoCliente;
        document.getElementById('reemision-cliente-doc').value = (doc && doc !== 'null' && doc !== 'SIN DOCUMENTO') ? doc : '';

        document.getElementById('reemision-cpe-tipo').value = data.comprobanteTipo || 'BOLETA';
        document.getElementById('reemision-cpe-medio').value = data.metodoPago || 'EFECTIVO';
        document.getElementById('reemision-cpe-obs').value = '';
        if (document.getElementById('reemision-cliente-dir')) {
            document.getElementById('reemision-cliente-dir').value = data.direccion || 'Chiclayo, Lambayeque';
        }

        // 2. Cargamos los detalles al buffer y disparamos el render matemático
        detallesPedidoEdicionBuffer = data.detalles;
        rebuildListaPlatosReemision();

    } catch (error) {
        console.error("Error al precargar datos:", error);
        contenedor.innerHTML = `<p class="text-danger small text-center py-3">⚠️ Error de red al leer la orden.</p>`;
    }
}

/**
 * 🔄 RENDERIZADOR Y CÁLCULO CONTABLE DE TOTALES (BASE GRAVADA E IGV)
 */
function rebuildListaPlatosReemision() {
    const contenedor = document.getElementById('reemision-contenedor-platos');
    let htmlRows = '';
    let totalComprobante = 0;

    detallesPedidoEdicionBuffer.forEach((item, index) => {
        if (!item.canceladoPorCliente) {
            if (!item.precioUnitarioBase) {
                item.precioUnitarioBase = item.subtotalInicial ? (item.subtotalInicial / item.cantidadInicial) : (item.subtotal / (item.cantidad || 1));
                item.cantidadInicial = item.cantidad;
                item.subtotalInicial = item.subtotal;
            }

            const esEliminado = item.cantidad === 0;
            totalComprobante += item.subtotal;

            htmlRows += `
                <div class="d-flex align-items-center justify-content-between p-2 mb-2 border rounded ${esEliminado ? 'bg-light-danger opacity-50' : 'bg-light'}" style="font-size: 0.85rem;">
                    <div style="max-width: 55%;">
                        <strong class="${esEliminado ? 'text-decoration-line-through text-muted' : 'text-dark'} d-block">${item.producto.nombre}</strong>
                        <span class="text-muted small">Precio U: S/ ${item.precioUnitarioBase.toFixed(2)}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <label class="small text-muted m-0">Cant:</label>
                        <input type="number" class="form-control form-control-sm text-center fw-bold text-secondary"
                               value="${item.cantidad}" min="0" max="99" style="width: 55px; padding: 2px;"
                               ${esEliminado ? 'disabled' : ''}
                               onchange="alterarCantidadReemision(${index}, this.value)" />
                        <span class="fw-bold text-jama-gold text-end ms-2" style="width: 80px;">S/ ${item.subtotal.toFixed(2)}</span>

                        <!-- BOTÓN ELIMINAR ÍTEM -->
                        <button type="button" class="btn btn-sm p-1 border-0"
                                onclick="alternarEliminacionItem(${index})"
                                title="${esEliminado ? 'Restaurar Plato' : 'Eliminar Plato'}">
                            ${esEliminado ? '➕' : '❌'}
                        </button>
                    </div>
                </div>
            `;
        }
    });

    contenedor.innerHTML = htmlRows || '<p class="text-muted small text-center py-3">Sin ítems activos</p>';

    const baseGravada = totalComprobante / 1.18;
    const igv = totalComprobante - baseGravada;

    if (document.getElementById('resumen-gravada')) {
        document.getElementById('resumen-gravada').innerText = `S/ ${baseGravada.toFixed(2)}`;
    }
    if (document.getElementById('resumen-igv')) {
        document.getElementById('resumen-igv').innerText = `S/ ${igv.toFixed(2)}`;
    }

    document.getElementById('reemision-monto-total').innerText = `S/ ${totalComprobante.toFixed(2)}`;

    if (document.getElementById('reemision-texto-letras')) {
        document.getElementById('reemision-texto-letras').innerText = `SON: ${numeroALetras(totalComprobante)} SOLES`;
    }
}

/**
 * ⚙️ RE-CÁLCULO MATEMÁTICO EN CALIENTE DESDE LA INTERFAZ (SOPORTA 0)
 */
function alterarCantidadReemision(index, nuevaCantidad) {
    let cantidad = parseInt(nuevaCantidad);
    if (isNaN(cantidad) || cantidad < 0) {
        cantidad = 0;
    }

    const item = detallesPedidoEdicionBuffer[index];
    item.cantidad = cantidad;
    item.subtotal = cantidad * item.precioUnitarioBase;
    rebuildListaPlatosReemision();
}

/**
 * 🗑️ FUNCIÓN PARA BOTÓN ELIMINAR ÍTEM AL VUELO
 */
function alternarEliminacionItem(index) {
    const item = detallesPedidoEdicionBuffer[index];

    if (item.cantidad > 0) {
        item.cantidadAnterior = item.cantidad;
        item.cantidad = 0;
        item.subtotal = 0;
    } else {
        item.shadow;
        item.cantidad = item.cantidadAnterior || item.cantidadInicial || 1;
        item.subtotal = item.cantidad * item.precioUnitarioBase;
    }
    rebuildListaPlatosReemision();
}

/**
 * 🚀 DISPARADOR FINAL DE ENVÍO DE LA DATA DE RE-EMISIÓN MODIFICADA AL BACKEND
 */
async function procesarTimbradoCorregido() {
    const idPedido = document.getElementById('reemision-pedido-id').value;
    const nuevoCliente = document.getElementById('reemision-cliente-nombre').value.trim();

    // 🚀 LECTURA DEL NUEVO INPUT DE CORREO AGREGADO AL MODAL
    const nuevoCorreo = document.getElementById('reemision-cliente-correo') ? document.getElementById('reemision-cliente-correo').value.trim() : '';

    const nuevoDoc = document.getElementById('reemision-cliente-doc').value.trim();
    const nuevoTipoCpe = document.getElementById('reemision-cpe-tipo').value;
    const nuevoMedioPago = document.getElementById('reemision-cpe-medio').value;
    const observacion = document.getElementById('reemision-cpe-obs') ? document.getElementById('reemision-cpe-obs').value.trim() : '';
    const direccion = document.getElementById('reemision-cliente-dir') ? document.getElementById('reemision-cliente-dir').value.trim() : 'Chiclayo, Lambayeque';

    // 🌟 VALIDACIÓN 1: Bloquear si se seleccionó FACTURA y el documento está vacío o no tiene 11 dígitos
    if (nuevoTipoCpe === 'FACTURA') {
        if (!nuevoDoc || nuevoDoc.length !== 11 || isNaN(nuevoDoc)) {
            Swal.fire({ icon: 'warning', title: 'RUC Inválido', text: 'Para emitir una Factura Electrónica es obligatorio un número de RUC válido de 11 dígitos.', confirmButtonColor: '#933D2D' });
            return;
        }
    }

    // Validation opcional de DNI si escriben algo en Boleta
    if (nuevoTipoCpe === 'BOLETA' && nuevoDoc.length > 0) {
        if (nuevoDoc.length !== 8 || isNaN(nuevoDoc)) {
            Swal.fire({ icon: 'warning', title: 'DNI Inválido', text: 'El número de DNI debe contener exactamente 8 dígitos numéricos.', confirmButtonColor: '#933D2D' });
            return;
        }
    }

    // 🌟 VALIDACIÓN 2: Evitar que el comprobante se quede sin ningún plato activo (Total = 0)
    const tienePlatosActivos = detallesPedidoEdicionBuffer.some(item => item.cantidad > 0);
    if (!tienePlatosActivos) {
        Swal.fire({ icon: 'warning', title: 'Comanda Vacía', text: 'No puedes emitir un nuevo comprobante sin ningún plato activo. Elimine la NV por completo si corresponde.', confirmButtonColor: '#933D2D' });
        return;
    }

    // 🌟 CONSTRUCCIÓN DEL PAYLOAD (Incluyendo la llave clienteCorreo que espera tu Backend)
    const payload = {
        pedidoId: idPedido,
        clienteNombre: nuevoCliente,
        clienteCorreo: nuevoCorreo, // 🚀 ENVIADO EN PERFECTA SINTONÍA CON TU BACKEND
        documento: nuevoDoc,
        comprobanteTipo: nuevoTipoCpe,
        metodoPago: nuevoMedioPago,
        direccion: direccion,
        observacion: observacion,
        detallesModificados: detallesPedidoEdicionBuffer.filter(item => item.cantidad > 0)
    };

    Swal.fire({
        title: 'Generando Nuevo Comprobante...',
        text: 'Se enviará la nueva estructura de venta corregida a miapi.cloud.',
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
            const modalElement = document.getElementById('modalEdicionReemision');
            const modalBootstrap = bootstrap.Modal.getInstance(modalElement);
            if (modalBootstrap) modalBootstrap.hide();

            await Swal.fire({ icon: 'success', title: '¡Nuevo CPE Emitido!', text: data.message, confirmButtonColor: '#1B3A2C' });
            window.location.reload();
        } else {
            Swal.fire({ icon: 'error', title: 'Error en Timbrado', text: data.message || 'SUNAT rechazó las modificaciones.', confirmButtonColor: '#933D2D' });
        }
    } catch (error) {
        console.error("Error al reemitir:", error);
        Swal.fire({ icon: 'error', title: 'Error Crítico', text: 'Incapacidad de establecer comunicación con el servidor contable.', confirmButtonColor: '#933D2D' });
    }
}

/**
 * 🔤 CONVERTIDOR MONETARIO A LETRAS AUTOMÁTICO
 */
function numeroALetras(numero) {
    const deman = Math.floor(numero);
    const centavos = Math.round((numero - deman) * 100);
    const textoCentavos = `${centavos.toString().padStart(2, '0')}/100`;

    const unidades = ["CERO", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ"];
    if (deman <= 10) return `${unidades[deman]} CON ${textoCentavos}`;
    return `${deman.toString().toUpperCase()} CON ${textoCentavos}`;
}

async function aplicarFiltroPorFecha() {
    const inicio = document.getElementById('filtroCpeFechaInicio').value;
    const fin    = document.getElementById('filtroCpeFechaFin').value;

    const url = new URL('/admin/comprobantes/api/lista', window.location.origin);
    if (inicio) url.searchParams.set('fechaInicio', inicio);
    if (fin)    url.searchParams.set('fechaFin', fin);

    try {
        const res  = await fetch(url.toString());
        const data = await res.json();
        renderizarTablas(data);
    } catch (e) {
        console.error('Error al cargar comprobantes:', e);
    }
}

function renderizarTablas(lista) {
    const tbodyPendientes = document.querySelector('#tablaPorEmitir tbody');
    const tbodyEmitidos   = document.querySelector('#tablaEmitidos tbody');
    const tbodyAnulados   = document.querySelector('#tablaAnulados tbody');

    tbodyPendientes.innerHTML = '';
    tbodyEmitidos.innerHTML   = '';
    tbodyAnulados.innerHTML   = '';

    lista.forEach(comp => {
        const mesa   = comp.numeroMesa ? `Mesa #${comp.numeroMesa}` : 'Carta Web';
        const monto  = parseFloat(comp.montoTotal).toFixed(2);
        const estado = comp.estado || '';

        // ── PENDIENTES (sin comprobanteNumero) ──────────────────────────────
        if (!comp.comprobanteNumero) {
            tbodyPendientes.insertAdjacentHTML('beforeend', `
                <tr>
                    <td class="fw-bold text-dark">NV-${comp.id}</td>
                    <td>${comp.fechaCreacion}</td>
                    <td><span class="badge-origen">${mesa}</span></td>
                    <td class="fw-bold text-dark text-start">${comp.cliente || ''}</td>
                    <td class="fw-bold text-jama-gold">S/. ${monto}</td>
                    <td>${badgeMetodoPago(comp.metodoPago)}</td>
                    <td><span class="badge-preferencia">${comp.preferenciaComprobante}</span></td>
                    <td class="text-center">
                        <div class="action-buttons-wrapper justify-content-center">
                            <button type="button" class="action-jama-btn btn-imprimir"
                                    onclick="verTicketTermico(${comp.id})" title="Imprimir Ticket Previo">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            </button>
                            <button type="button" class="action-jama-btn btn-timbrar btn-timbrar-trigger"
                                    data-id="${comp.id}"
                                    data-preferencia="${comp.preferenciaComprobante}"
                                    data-documento="${comp.documentoCliente || ''}"
                                    onclick="capturarYTimbrar(this)" title="Emitir CPE Oficial">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 15c.1-.7.3-1.4.3-2.2a8 8 0 0 0-16 0c0 .8.1 1.5.3 2.2"></path><path d="M12 11v9"></path><polyline points="8 16 12 20 16 16"></polyline></svg>
                            </button>
                        </div>
                    </td>
                </tr>`);
            return;
        }

        // ── ANULADOS ─────────────────────────────────────────────────────────
        if (estado === 'ANULADO') {
            const notaNum   = comp.comprobanteNotaNumero || 'Generando...';
            const a4Url     = comp.comprobanteA4Url;
            const pdfUrl    = comp.comprobantePdfUrl;
            const a4Style   = a4Url  ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';
            const pdfStyle  = pdfUrl ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';

            tbodyAnulados.insertAdjacentHTML('beforeend', `
                <tr class="align-middle text-muted" style="cursor:pointer;background-color:#fdf2f2;"
                    data-bs-toggle="collapse" data-bs-target="#desglose-anulado-${comp.id}">
                    <td>
                        <div class="fw-bold">
                            <span>NV-${comp.id}</span>
                            <span class="badge bg-secondary ms-1 font-monospace" style="text-decoration:line-through;">${comp.comprobanteNumero}</span>
                        </div>
                    </td>
                    <td class="fw-bold text-danger font-monospace">${notaNum}</td>
                    <td>${comp.fechaCreacion}</td>
                    <td class="fw-semibold text-start text-dark">${comp.cliente || ''}</td>
                    <td class="fw-bold text-danger text-end">S/. ${monto}</td>
                    <td>
                        <span class="badge bg-danger text-light fw-bold px-2 py-1 rounded-pill small"
                              style="font-size:0.72rem;display:inline-flex;align-items:center;gap:4px;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                            ANULADO (CPE)
                        </span>
                    </td>
                    <td class="text-center" onclick="event.stopPropagation();">
                        <div class="action-buttons-wrapper justify-content-center" style="display:flex;gap:6px;align-items:center;">
                            <a href="/admin/comprobantes/imprimir-nota-a4/${comp.id}" target="_blank" class="action-jama-btn bg-primary border-primary text-light" title="Ver Nota de Crédito Oficial (A4)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></a>
                            <a href="/admin/comprobantes/imprimir-nota/${comp.id}" target="_blank" class="action-jama-btn bg-success border-success text-light" title="Imprimir Ticket Nota de Crédito (80mm)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></a>
                            <a href="/admin/comprobantes/xml-nota/${comp.id}" target="_blank" class="action-jama-btn bg-dark border-dark text-light" title="Ver XML Firmado de la Nota de Crédito"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></a>
                            <button type="button" class="action-jama-btn text-light shadow-sm"
                                    onclick="abrirEditorReemision(${comp.id})"
                                    title="Editar y Emitir Nuevo Comprobante Corregido"
                                    style="background-color:#d97706;border-color:#b45309;">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                        </div>
                    </td>
                </tr>
                <tr id="desglose-anulado-${comp.id}" class="collapse bg-light">
                    <td colspan="7" class="p-3" style="background-color:#FFF5F5;border-left:4px solid #dc2626;">
                        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                            <div>
                                <span class="fw-bold small text-muted text-uppercase d-block mb-2">Historial de Auditoría Interna:</span>
                                <div class="p-2 border rounded-3 bg-white font-monospace text-secondary" style="font-size:0.82rem;">
                                    • CPE Referencia: <span>${comp.comprobanteNumero}</span><br>
                                    • NC Liquidadora: <span class="fw-bold text-danger">${notaNum}</span><br>
                                    • Total Devuelto: S/. ${monto}
                                </div>
                            </div>
                            <div class="text-end" onclick="event.stopPropagation();">
                                <span class="fw-bold small text-muted text-uppercase d-block mb-2 text-md-end">Documentos del CPE Original Afectado:</span>
                                <div class="action-buttons-wrapper justify-content-md-end" style="display:flex;gap:6px;align-items:center;">
                                    <a href="${a4Url  || '#'}" ${a4Url  ? 'target="_blank"' : ''} class="action-jama-btn bg-primary border-primary text-light" style="${a4Style}"  title="Ver CPE Original (A4)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span class="ms-1 d-none d-sm-inline" style="font-size:0.75rem;">Ver PDF A4</span></a>
                                    <a href="${pdfUrl || '#'}" ${pdfUrl ? 'target="_blank"' : ''} class="action-jama-btn bg-success border-success text-light" style="${pdfStyle}" title="Imprimir Ticket Original (80mm)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg><span class="ms-1 d-none d-sm-inline" style="font-size:0.75rem;">Ver Ticket</span></a>
                                    <a href="/admin/comprobantes/xml/${comp.id}" target="_blank" class="action-jama-btn bg-dark border-dark text-light" title="Ver XML Firmado CPE Original"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg><span class="ms-1 d-none d-sm-inline" style="font-size:0.75rem;">Ver XML</span></a>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>`);
            return;
        }

        // ── EMITIDOS ─────────────────────────────────────────────────────────
        const a4Url    = comp.comprobanteA4Url;
        const pdfUrl   = comp.comprobantePdfUrl;
        const a4Style  = a4Url  ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';
        const pdfStyle = pdfUrl ? '' : 'opacity:0.35;cursor:not-allowed;pointer-events:none;';

        tbodyEmitidos.insertAdjacentHTML('beforeend', `
            <tr>
                <td>
                    <div class="fw-bold text-dark">
                        <span>NV-${comp.id}</span>
                        <span class="badge bg-secondary ms-1 font-monospace">${comp.comprobanteNumero}</span>
                    </div>
                    <small class="text-muted">${comp.fechaCreacion}</small>
                </td>
                <td><span class="badge-origen">${mesa}</span></td>
                <td class="fw-bold text-dark text-start">${comp.cliente || ''}</td>
                <td class="fw-bold text-jama-gold text-end">S/. ${monto}</td>
                <td>${badgeMetodoPago(comp.metodoPago)}</td>
                <td>
                    <span class="badge-estado-sunat">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="me-1"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        EMITIDO
                    </span>
                </td>
                <td class="text-center">
                    <div class="action-buttons-wrapper justify-content-center" style="display:flex;gap:6px;align-items:center;">
                        <a href="${a4Url  || '#'}" ${a4Url  ? 'target="_blank"' : ''} class="action-jama-btn bg-primary border-primary text-light"  style="${a4Style}"  title="Ver Factura/Boleta Oficial (A4)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></a>
                        <a href="${pdfUrl || '#'}" ${pdfUrl ? 'target="_blank"' : ''} class="action-jama-btn bg-success border-success text-light" style="${pdfStyle}" title="Imprimir Ticket (80mm)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></a>
                        <a href="/admin/comprobantes/xml/${comp.id}" target="_blank" class="action-jama-btn bg-dark border-dark text-light" title="Ver XML Firmado SUNAT"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></a>
                        <button type="button" class="action-jama-btn bg-danger border-danger text-light"
                                data-id="${comp.id}" data-cpe="${comp.comprobanteNumero}"
                                onclick="capturarYAnular(this)" title="Emitir Nota de Crédito Total">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                        </button>
                    </div>
                </td>
            </tr>`);
    });
    actualizarMensajesVacios();
}

// =========================================================================
// 📡 FILTRADO MULTIVARIABLE ASÍNCRONO EN TIEMPO REAL (AUDITORÍA COMPROBANTES)
// =========================================================================
document.addEventListener('DOMContentLoaded', function() {
    const txtBusqueda = document.getElementById('filtroCpeTexto');
    const fechaInicio = document.getElementById('filtroCpeFechaInicio');
    const fechaFin = document.getElementById('filtroCpeFechaFin');
    const selectMetodo = document.getElementById('filtroCpeMetodo');
    const selectOrigen = document.getElementById('filtroCpeOrigen');

    if (txtBusqueda && fechaInicio && fechaFin && selectMetodo && selectOrigen) {
        // Enlazar escuchadores en caliente para reaccionar al instante sin F5
        txtBusqueda.addEventListener('keyup', ejecutarFiltroCruzadoComprobantes);
        fechaInicio.addEventListener('change', aplicarFiltroPorFecha);
        fechaFin.addEventListener('change', aplicarFiltroPorFecha);
        selectMetodo.addEventListener('change', ejecutarFiltroCruzadoComprobantes);
        selectOrigen.addEventListener('change', ejecutarFiltroCruzadoComprobantes);
    }
    actualizarMensajesVacios();
});

function ejecutarFiltroCruzadoComprobantes() {
    const textoVal = document.getElementById('filtroCpeTexto').value.toLowerCase();
    const fInicioVal = document.getElementById('filtroCpeFechaInicio').value;
    const fFinVal = document.getElementById('filtroCpeFechaFin').value;
    const metodoVal = document.getElementById('filtroCpeMetodo').value; // TODOS, EFECTIVO, YAPE, TARJETA
    const origenVal = document.getElementById('filtroCpeOrigen').value; // TODOS, SALON, DELIVERY

    // Convertimos fechas de control a timestamps UNIX para validación exacta de plazos
    const timestampInicio = fInicioVal ? new Date(fInicioVal + "T00:00:00").getTime() : null;
    const timestampFin = fFinVal ? new Date(fFinVal + "T23:59:59").getTime() : null;

    // Ejecutamos el filtro unificado sobre las 3 tablas del panel contable
    const idsTablas = ['tablaPorEmitir', 'tablaEmitidos', 'tablaAnulados'];

    idsTablas.forEach(idTabla => {
        const tabla = document.getElementById(idTabla);
        if (!tabla) return;

        const filas = tabla.querySelectorAll('tbody tr');

        filas.forEach(fila => {
            // Omitimos evaluar de forma directa las filas hijas de colapso en anulados (se manejan por herencia)
            if (fila.id && fila.id.startsWith('desglose-anulado-')) return;

            const contenidoFila = fila.textContent.toLowerCase();

            // 1. EXTRAER MÉTODO DE PAGO DESDE TEXTO DE CELDA
            let metodoFila = 'EFECTIVO';
            if (contenidoFila.includes('tarjeta')) metodoFila = 'TARJETA';
            else if (contenidoFila.includes('yape') || contenidoFila.includes('plin')) metodoFila = 'YAPE';

            // 2. EXTRAER ORIGEN DE SERVICIO DESDE TEXTO DE CELDA
            let origenFila = 'DELIVERY';
            if (contenidoFila.includes('mesa #') || contenidoFila.includes('salón') || contenidoFila.includes('salon')) {
                origenFila = 'SALON';
            }

            // 3. EXTRAER Y EVALUAR RANGO DE FECHAS (Formato esperado dd/mm/yyyy en la celda correspondiente)
            let coincideFecha = true;
            let textoFechaCelda = '';

            // Buscamos dinámicamente la celda que contiene la fecha según la estructura de la tabla
            if (idTabla === 'tablaPorEmitir' && fila.cells[1]) textoFechaCelda = fila.cells[1].textContent;
            else if (idTabla === 'tablaEmitidos' && fila.querySelector('small')) textoFechaCelda = fila.querySelector('small').textContent;
            else if (idTabla === 'tablaAnulados' && fila.cells[2]) textoFechaCelda = fila.cells[2].textContent;

            if (textoFechaCelda && (timestampInicio || timestampFin)) {
                // Formato: 20/06/2026 14:32 -> Extraemos dd/mm/yyyy
                const partesFecha = textoFechaCelda.trim().split(' ')[0].split('/');
                if (partesFecha.length === 3) {
                    const fechaFilaObj = new Date(`${partesFecha[2]}-${partesFecha[1]}-${partesFecha[0]}T12:00:00`);
                    const timeFila = fechaFilaObj.getTime();

                    if (timestampInicio && timeFila < timestampInicio) coincideFecha = false;
                    if (timestampFin && timeFila > timestampFin) coincideFecha = false;
                }
            }

            // ── EVALUACIÓN DE ADUANA FINANCIERA (Filtro Cruzado) ──
            const coincideTexto = contenidoFila.includes(textoVal);
            const coincideMetodo = (metodoVal === 'TODOS' || metodoFila === metodoVal);
            const coincideOrigen = (origenVal === 'TODOS' || origenFila === origenVal);

            // Buscamos si la fila tiene un desglose de auditoría colapsable acoplado (Pestaña Anulados)
            let desgloseHijo = null;
            if (idTabla === 'tablaAnulados' && fila.hasAttribute('th:data-bs-target')) {
                const targetId = fila.getAttribute('th:data-bs-target') || fila.getAttribute('data-bs-target');
                if (targetId) desgloseHijo = document.querySelector(targetId);
            } else if (idTabla === 'tablaAnulados') {
                // Fallback por proximidad en el DOM
                const siguienteFila = fila.nextElementSibling;
                if (siguienteFila && siguienteFila.id && siguienteFila.id.startsWith('desglose-anulado-')) {
                    desgloseHijo = siguienteFila;
                }
            }

            // Aplicamos visibilidad en bloque
            if (coincideTexto && coincideMetodo && coincideOrigen && coincideFecha) {
                fila.style.removeProperty('display');
            } else {
                fila.style.display = 'none';
                // Si la fila principal se oculta, cerramos y ocultamos obligatoriamente su desglose de auditoría
                if (desgloseHijo) {
                    desgloseHijo.style.display = 'none';
                    desgloseHijo.classList.remove('show');
                }
            }
        });
    });
     actualizarMensajesVacios();
}

function limpiarFiltrosComprobantesAsincronos() {
    document.getElementById('filtroCpeTexto').value  = '';
    document.getElementById('filtroCpeFechaInicio').value = '';
    document.getElementById('filtroCpeFechaFin').value    = '';
    document.getElementById('filtroCpeMetodo').value = 'TODOS';
    document.getElementById('filtroCpeOrigen').value = 'TODOS';

    aplicarFiltroPorFecha(); // recarga con turno de hoy sin params

    if (typeof Swal !== 'undefined') {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Filtros restaurados', showConfirmButton: false, timer: 1800 });
    }
}

function actualizarMensajesVacios() {
    const hayFiltrosActivos =
        document.getElementById('filtroCpeTexto').value.trim() !== '' ||
        document.getElementById('filtroCpeFechaInicio').value !== '' ||
        document.getElementById('filtroCpeFechaFin').value !== '' ||
        document.getElementById('filtroCpeMetodo').value !== 'TODOS' ||
        document.getElementById('filtroCpeOrigen').value !== 'TODOS';

    const configs = [
        { tablaId: 'tablaPorEmitir',  cols: 8 },
        { tablaId: 'tablaEmitidos',   cols: 7 },
        { tablaId: 'tablaAnulados',   cols: 7 },
    ];

    configs.forEach(({ tablaId, cols }) => {
        const tabla  = document.getElementById(tablaId);
        if (!tabla) return;

        const tbody  = tabla.querySelector('tbody');
        const filas  = [...tbody.querySelectorAll('tr')].filter(f =>
            !f.id?.startsWith('desglose-anulado-') && f.style.display !== 'none'
        );

        // Quitamos mensaje previo si existía
        const previo = tbody.querySelector('.fila-vacia-jama');
        if (previo) previo.remove();

        if (filas.length === 0) {
            const svg = hayFiltrosActivos
                ? `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 text-muted opacity-50"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`
                : `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-2 text-muted opacity-50"><path d="M3 7h18M3 12h18M3 17h18"/><circle cx="12" cy="12" r="10" stroke-dasharray="4 2"/></svg>`;

            const mensaje = hayFiltrosActivos
                ? 'No se encontraron resultados'
                : 'Nada por aquí';

            const subtexto = hayFiltrosActivos
                ? 'Prueba ajustando los filtros de búsqueda.'
                : 'Aún no hay registros en este turno.';

            tbody.insertAdjacentHTML('beforeend', `
                <tr class="fila-vacia-jama">
                    <td colspan="${cols}" class="text-center py-5 text-muted">
                        <div class="d-flex flex-column align-items-center gap-1">
                            ${svg}
                            <span class="fw-semibold" style="font-size: 0.95rem;">${mensaje}</span>
                            <span class="small opacity-75">${subtexto}</span>
                        </div>
                    </td>
                </tr>`);
        }
    });
}

function actualizarBadgesMetodo() {
    const valorActual = document.getElementById('filtroCpeMetodo').value;
    document.querySelectorAll('.badge-metodo-filtro-jama').forEach(b => {
        b.classList.remove('activo');
    });
    if (valorActual !== 'TODOS') {
        // Yape y Plin comparten el mismo valor 'YAPE' en el select
        document.querySelectorAll('.badge-metodo-filtro-jama').forEach(b => {
            const onclick = b.getAttribute('onclick') || '';
            if (onclick.includes(`'${valorActual}'`)) b.classList.add('activo');
        });
    }
}

function seleccionarMetodo(valor) {
    const select = document.getElementById('filtroCpeMetodo');
    select.value = select.value === valor ? 'TODOS' : valor;
    actualizarBadgesMetodo();
    ejecutarFiltroCruzadoComprobantes();
}

function badgeMetodoPago(metodo) {
    const m = (metodo || 'EFECTIVO').toUpperCase();

    if (m === 'EFECTIVO') {
        return `<span class="badge-metodo-jama bm-efectivo">
                    <img src="/img/Efectivo.png" alt="Efectivo" style="width:13px;height:13px;object-fit:contain;">
                    Efectivo
                </span>`;
    }
    if (m === 'YAPE') {
        return `<span class="badge-metodo-jama bm-digital">
                    <img src="/img/Yape.png" alt="Yape" style="width:13px;height:13px;object-fit:contain;">
                    Yape
                </span>`;
    }
    if (m === 'PLIN') {
        return `<span class="badge-metodo-jama bm-plin">
                    <img src="/img/Plin.png" alt="Plin" style="width:13px;height:13px;object-fit:contain;">
                    Plin
                </span>`;
    }
    if (m === 'TARJETA') {
        return `<span class="badge-metodo-jama bm-tarjeta">
                    <img src="/img/Tarjeta.png" alt="Tarjeta" style="width:13px;height:13px;object-fit:contain;">
                    Tarjeta
                </span>`;
    }
    // fallback para YAPE_PLIN u otros valores combinados
    return `<span class="badge-metodo-jama bm-digital">
                <img src="/img/YapePlin.png" alt="Yape/Plin" style="width:13px;height:13px;object-fit:contain;">
                Yape/Plin
            </span>`;
}

// =========================================================================
// 📄 PAGINACIÓN LOCAL — AUDITORÍA COMPROBANTES (PATRÓN CAJA)
// =========================================================================
const LIMITE_COMPROBANTES_PAGINA = 15;

let estadoPaginacionComprobantes = {
    'tablaPorEmitir':  { pagina: 1, infoId: 'infoPagPorEmitir',  paginadorId: 'paginadorPorEmitir'  },
    'tablaEmitidos':   { pagina: 1, infoId: 'infoPagEmitidos',   paginadorId: 'paginadorEmitidos'   },
    'tablaAnulados':   { pagina: 1, infoId: 'infoPagAnulados',   paginadorId: 'paginadorAnulados'   },
};

function ejecutarPaginacionComprobantes(tablaId) {
    const config = estadoPaginacionComprobantes[tablaId];
    if (!config) return;

    const tabla      = document.getElementById(tablaId);
    const infoSpan   = document.getElementById(config.infoId);
    const paginadorUl = document.getElementById(config.paginadorId);

    if (!tabla || !infoSpan || !paginadorUl) return;

    // Solo filas de datos reales — excluye desgloses de anulados, filas vacías y filas ocultas por filtro
    const filas = Array.from(tabla.querySelectorAll('tbody tr')).filter(tr =>
        !tr.id?.startsWith('desglose-anulado-') &&
        !tr.classList.contains('fila-vacia-jama') &&
        tr.style.display !== 'none'
    );

    const total       = filas.length;
    const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_COMPROBANTES_PAGINA));

    if (config.pagina > totalPaginas) config.pagina = totalPaginas;
    if (config.pagina < 1)            config.pagina = 1;

    // Ocultar todo primero
    tabla.querySelectorAll('tbody tr').forEach(tr => {
        if (!tr.id?.startsWith('desglose-anulado-') && !tr.classList.contains('fila-vacia-jama')) {
            if (tr.style.display !== 'none') {
                tr.setAttribute('data-pag-oculto', 'true');
                tr.style.setProperty('display', 'none', 'important');
            }
        }
    });

    const inicio = (config.pagina - 1) * LIMITE_COMPROBANTES_PAGINA;
    const fin    = Math.min(inicio + LIMITE_COMPROBANTES_PAGINA, total);

    // Mostrar el rango de la página actual
    for (let i = inicio; i < fin; i++) {
        if (filas[i]) {
            filas[i].removeAttribute('data-pag-oculto');
            filas[i].style.removeProperty('display');

            // Si es fila de anulado, mostrar también su desglose si estaba expandido
            const siguiente = filas[i].nextElementSibling;
            if (siguiente?.id?.startsWith('desglose-anulado-')) {
                siguiente.style.removeProperty('display');
            }
        }
    }

    // Info de registros
    infoSpan.innerText = total === 0
        ? 'Mostrando 0 registros'
        : `Mostrando ${inicio + 1}–${fin} de ${total} registros`;

    // Renderizar paginador
    paginadorUl.innerHTML = '';

    const liPrev = document.createElement('li');
    liPrev.className = `page-item-jama ${config.pagina === 1 ? 'disabled' : ''}`;
    liPrev.innerHTML = `<button type="button" class="page-link-jama">Anterior</button>`;
    liPrev.onclick = () => {
        if (config.pagina > 1) { config.pagina--; ejecutarPaginacionComprobantes(tablaId); }
    };
    paginadorUl.appendChild(liPrev);

    // Números de página — con elipsis si hay muchas
    const rango = 2;
    for (let p = 1; p <= totalPaginas; p++) {
        const esExtremo  = p === 1 || p === totalPaginas;
        const esCercano  = Math.abs(p - config.pagina) <= rango;

        if (!esExtremo && !esCercano) {
            // Elipsis solo una vez por hueco
            const ultimo = paginadorUl.lastElementChild;
            if (ultimo && !ultimo.classList.contains('elipsis-jama')) {
                const liElipsis = document.createElement('li');
                liElipsis.className = 'page-item-jama elipsis-jama disabled';
                liElipsis.innerHTML = `<span class="page-link-jama" style="cursor:default;">…</span>`;
                paginadorUl.appendChild(liElipsis);
            }
            continue;
        }

        const liPag = document.createElement('li');
        liPag.className = `page-item-jama ${p === config.pagina ? 'active' : ''}`;
        liPag.innerHTML = `<button type="button" class="page-link-jama">${p}</button>`;
        liPag.onclick = () => { config.pagina = p; ejecutarPaginacionComprobantes(tablaId); };
        paginadorUl.appendChild(liPag);
    }

    const liNext = document.createElement('li');
    liNext.className = `page-item-jama ${config.pagina === totalPaginas ? 'disabled' : ''}`;
    liNext.innerHTML = `<button type="button" class="page-link-jama">Siguiente</button>`;
    liNext.onclick = () => {
        if (config.pagina < totalPaginas) { config.pagina++; ejecutarPaginacionComprobantes(tablaId); }
    };
    paginadorUl.appendChild(liNext);
}

// Resetea a página 1 y repagina — llamar después de cualquier filtro o re-render
function repaginarTodas() {
    Object.keys(estadoPaginacionComprobantes).forEach(id => {
        estadoPaginacionComprobantes[id].pagina = 1;
        ejecutarPaginacionComprobantes(id);
    });
}