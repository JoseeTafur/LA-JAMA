// culqi-client.js
import { carrito } from './core-cart.js';
import { enviarPedidoFinal } from './api-client.js';

const CULQI_PUBLIC_KEY = 'pk_test_O0b7218b628b08ff';

export function iniciarPasarelaCulqi() {
    const totalCentavos = carrito.reduce((sum, item) => sum + item.precio, 0) * 100;

    if (totalCentavos <= 0) return;

    Culqi.publicKey = CULQI_PUBLIC_KEY;

    Culqi.settings({
        title: 'La Jama · Pasarela Real',
        currency: 'PEN',
        amount: Math.round(totalCentavos)
    });

    Culqi.options({
        paymentMethods: {
            tarjeta: true, // El flujo base que no requiere generación de órdenes previas
            yape: false,
            billetera: false,
            pagoEfectivo: false
        },
        style: {
            bannerColor: '#1B3A2C',
            buttonBackground: '#1B3A2C'
        }
    });

    Culqi.open();
}

// ── ESTE ES EL CALLBACK REAL QUE INYECTA CULQI EN EL NAVEGADOR ──
window.culqi = async function() {
    if (Culqi.token) {
        const tokenId = Culqi.token.id;
        const email = Culqi.token.email;

        console.log("✅ ¡TOKEN REAL DE CULQI GENERADO EN SANDBOX!: " + tokenId);
        Culqi.close();

        // Enviamos el token verdadero a tu servidor de Spring Boot
        await enviarPedidoFinal(tokenId, email);
    } else {
        console.error("Error en Culqi Real:", Culqi.error);
        Swal.fire({ icon: 'error', title: 'Error', text: Culqi.error.user_message });
    }
};