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

    // 1. Mostrar vista previa estética de inmediato
    const reader = new FileReader();
    reader.onload = () => {
        if (preview) { preview.src = reader.result; preview.style.display = 'block'; }
    };
    reader.readAsDataURL(file);

    // 2. Encender Loader de Escaneo de La Jama
    if (loader) loader.classList.add('show');
    if (btnFinalizar) {
        btnFinalizar.disabled = true;
        btnFinalizar.style.opacity = "0.4";
        btnFinalizar.style.pointerEvents = "none";
    }

    // 3. Preparar el payload asíncrono
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

        // 🎯 REINYECTAMOS TU LOG RADAR DE CONTROL
        console.log("🎯 === [RESPUESTA DEL SERVIDOR DESDE GROQ] ===", data);

        if (!res.ok) {
            // 🚨 DETECTAMOS TU ALERTA PERSONALIZADA DE CORRESPONDENCIA EQUIVOCADA
            if (data.reason === "METODO_EQUIVOCADO") {
                throw new Error("¡Subiste el comprobante en el método de pago equivocado! Revisa tu captura.");
            }
            throw new Error(data.message || "Error al verificar comprobante.");
        }

        // 4. APROBADO: Almacenamos los datos auditados en el estado dinámico del checkout
        if (!window.estadoCheckout) {
            window.estadoCheckout = {};
        }
        window.estadoCheckout.codigoOperacion = data.numeroOperacion;
        window.estadoCheckout.imgUrlVoucher = data.imgUrl;

        // 5. Mutación de la UI: Activamos el botón de confirmación final
        if (btnFinalizar) {
            btnFinalizar.disabled = false;
            btnFinalizar.style.opacity = "1";
            btnFinalizar.style.pointerEvents = "auto";
        }

        if (typeof Swal !== 'undefined') {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Voucher aprobado.', showConfirmButton: false, timer: 2500 });
        }

    } catch (error) {
        console.error("🚨 [RECHAZO DE ADUANA]:", error);

        // Limpiamos los inputs ante el fraude o error
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