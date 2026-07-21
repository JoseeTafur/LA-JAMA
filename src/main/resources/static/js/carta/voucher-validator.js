import { actualizarUI } from '/js/carta/core-cart.js';
import { estadoCheckout } from './checkout-wizard.js';

function obtenerTotalEsperado() {
    if (window.estadoCheckout && window.estadoCheckout.total) {
        return window.estadoCheckout.total;
    }
    const elementoTotal = document.getElementById('totalCarrito');
    if (elementoTotal) {
        const texto = elementoTotal.innerText.replace(/[^0-9.]/g, '');
        return parseFloat(texto) || 0;
    }
    return 0;
}

export async function procesarYVerificarVoucher(event, tipoMetodo) {
    const input = event.target;
    const sufijo = tipoMetodo.charAt(0) + tipoMetodo.slice(1).toLowerCase();

    const preview = document.getElementById(`imgPrevia${sufijo}`);
    const loader = document.getElementById(`loader${sufijo}`);
    const btnFinalizar = document.getElementById('btnFinalizarPedido');

    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
    };
    reader.readAsDataURL(file);

    if (loader) loader.classList.add('show');
    if (btnFinalizar) {
        btnFinalizar.disabled = true;
        btnFinalizar.style.opacity = "0.4";
        btnFinalizar.style.pointerEvents = "none";
    }

    const totalCarrito = obtenerTotalEsperado();
    const formData = new FormData();
    formData.append("voucher", file);
    formData.append("metodoPago", tipoMetodo);
    formData.append("montoEsperado", totalCarrito);

    try {
        const res = await fetch('/carta/validar-voucher', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            if (data.reason === "METODO_EQUIVOCADO") {
                throw new Error("¡Subiste el comprobante en el método de pago equivocado! Revisa tu captura.");
            }
            throw new Error(data.message || "Error al verificar comprobante.");
        }

        if (!window.estadoCheckout) {
            window.estadoCheckout = {};
        }
        window.estadoCheckout.codigoOperacion = data.numeroOperacion;
        window.estadoCheckout.imgUrlVoucher = data.imgUrl;

        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            btnFinalizar.style.opacity = "1";
            btnFinalizar.style.pointerEvents = "auto";
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Voucher aprobado.', showConfirmButton: false, timer: 2500 });
        }

    } catch (error) {
        input.value = '';
        if (preview) { preview.src = ''; preview.style.display = 'none'; }

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Validación Fallida',
                text: error.message,
                confirmButtonColor: '#933D2D'
            });
        }
    } finally {
        if (loader) loader.classList.remove('show');
    }
}

window.procesarYVerificarVoucher = procesarYVerificarVoucher;