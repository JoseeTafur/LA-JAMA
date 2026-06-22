// checkout-wizard.js
export let estadoCheckout = { etapa: 1, tipoEntrega: 'DELIVERY', metodoPago: 'YAPE' };

export function navegarEtapa(direccion, iniciarMapaCallback) {
    if (direccion === 1 && !validarPasoActual()) return;

    estadoCheckout.etapa += direccion;
    if (estadoCheckout.etapa < 1) estadoCheckout.etapa = 1;
    if (estadoCheckout.etapa > 4) estadoCheckout.etapa = 4;

    document.querySelectorAll('.jama-checkout-step').forEach(step => step.classList.add('d-none'));
    document.getElementById(`checkout-step-${estadoCheckout.etapa}`).classList.remove('d-none');

    for (let i = 1; i <= 4; i++) {
        const node = document.getElementById(`indicator-step-${i}`);
        if (i < estadoCheckout.etapa) node.className = "jama-step-node completed";
        else if (i === estadoCheckout.etapa) node.className = "jama-step-node active";
        else node.className = "jama-step-node";
    }

    if (document.getElementById('stepProgressBar')) {
        document.getElementById('stepProgressBar').style.width = `${((estadoCheckout.etapa - 1) / 3) * 100}%`;
    }

    document.getElementById('btnAtrasStep').classList.toggle('d-none', estadoCheckout.etapa === 1);
    document.getElementById('btnCancelarCheckout').classList.toggle('d-none', estadoCheckout.etapa !== 1);
    document.getElementById('btnSiguienteStep').classList.toggle('d-none', estadoCheckout.etapa === 4);
    document.getElementById('btnFinalizarPedido').classList.toggle('d-none', estadoCheckout.etapa !== 4);

    if (estadoCheckout.etapa === 2 && estadoCheckout.tipoEntrega === 'DELIVERY') {
        iniciarMapaCallback();
    }
}

function validarPasoActual() {
    if (estadoCheckout.etapa === 2 && estadoCheckout.tipoEntrega === 'DELIVERY') {
        if (!document.getElementById('direccionCliente').value.trim() || !document.getElementById('latCliente').value) {
            Swal.fire({ icon: 'warning', title: 'Ubicación Requerida', text: 'Marque su punto en el mapa.' });
            return false;
        }
    }
    if (estadoCheckout.etapa === 3) {
        const nombre = document.getElementById('nombreCliente').value.trim();
        const tipoDoc = document.getElementById('preferenciaComprobante').value;
        const numDoc = document.getElementById('numeroDocumento').value.trim();

        if (!nombre) {
            Swal.fire({ icon: 'error', title: 'Dato Requerido', text: 'El nombre completo o razón social es obligatorio.' });
            return false;
        }

        // Impedir continuar si los campos numéricos están incompletos
        if (numDoc) {
            if (tipoDoc === 'BOLETA' && numDoc.length !== 8) {
                Swal.fire({ icon: 'error', title: 'DNI Incompleto', text: 'El DNI civil debe contener exactamente 8 dígitos.' });
                return false;
            }
            if (tipoDoc === 'FACTURA' && numDoc.length !== 11) {
                Swal.fire({ icon: 'error', title: 'RUC Incompleto', text: 'El RUC comercial debe contener exactamente 11 dígitos.' });
                return false;
            }
        } else if (tipoDoc === 'FACTURA') {
            Swal.fire({ icon: 'error', title: 'RUC Requerido', text: 'Debe ingresar un número de RUC obligatorio para Facturas.' });
            return false;
        }
    }
    return true;
}