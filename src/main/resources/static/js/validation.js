/**
 * validation.js — Utilidad global de validaciones para La Jama
 * Se aplica automáticamente a todos los formularios del sistema.
 */

const Validation = {

    // Límites globales del sistema
    LIMITES: {
        NOMBRE_MAX: 50,
        DESCRIPCION_MAX: 150,
        CORREO_MAX: 50,
        USUARIO_MAX: 25,
        CLAVE_MIN: 6,
        CLAVE_MAX: 30,
        TELEFONO_EXACTO: 9,
        DNI_EXACTO: 8,
        PRECIO_MIN: 10,
        PRECIO_MAX: 70,
        ARCHIVO_MAX_BYTES: 5 * 1024 * 1024
    },

    soloLetras(texto) {
        if (!texto || texto.trim() === '') return false;
        return /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/.test(texto.trim());
    },

    soloNumeros(texto) {
        if (!texto || texto.trim() === '') return false;
        return /^[0-9]+$/.test(texto.trim());
    },

    precioValido(valor) {
        const num = parseFloat(valor);
        return !isNaN(num) && num >= this.LIMITES.PRECIO_MIN && num <= this.LIMITES.PRECIO_MAX;
    },

    longitudValida(texto, max) {
        return texto != null && texto.trim().length <= max;
    },

    telefonoValido(texto) {
        return texto != null && new RegExp(`^[0-9]{${this.LIMITES.TELEFONO_EXACTO}}$`).test(texto.trim());
    },

    dniValido(texto) {
        return texto != null && new RegExp(`^[0-9]{${this.LIMITES.DNI_EXACTO}}$`).test(texto.trim());
    },

    correoValido(texto) {
        if (!texto || texto.trim() === '') return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim()) && texto.trim().length <= this.LIMITES.CORREO_MAX;
    },

    fechaDentroDeRango(fechaStr) {
        if (!fechaStr) return false;
        const fecha = new Date(fechaStr);
        const minima = new Date('1950-01-01');
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        return fecha >= minima && fecha <= hoy;
    },

    fechaNoFutura(fechaStr) {
        if (!fechaStr) return false;
        const fecha = new Date(fechaStr);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        return fecha <= hoy;
    },

    fechaRazonable(fechaStr) {
        return this.fechaDentroDeRango(fechaStr);
    },

    validarImagenVoucher(inputElement) {
        if (!inputElement || !inputElement.files || inputElement.files.length === 0) return false;

        const archivo = inputElement.files[0];
        const formatosPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

        // 1. Validar Tipo de Formato (MIME Type)
        if (!formatosPermitidos.includes(archivo.type)) {
            this.mostrarError("Formato no soportado. Suba solo JPG, PNG o WEBP.");
            inputElement.value = ''; // Limpia el input para obligar a subir uno válido
            return false;
        }

        // 2. Validar Peso Máximo
        if (archivo.size > this.LIMITES.ARCHIVO_MAX_BYTES) {
            this.mostrarError("El archivo excede los 5MB permitidos.");
            inputElement.value = ''; // Limpia el input
            return false;
        }

        return true; // Pasa la aduana con éxito
    },

    quitarEmojis(texto) {
        return texto.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27FF}]|[\u{FE00}-\u{FEFF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA9F}]|[\u{2300}-\u{23FF}]|[\u{2B00}-\u{2BFF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]/gu, '');
    },

    mostrarError(mensaje) {
        const utils = (typeof AppUtils !== 'undefined') ? AppUtils : window.AppUtils;

        if (utils && typeof utils.showNotification === 'function') {
            utils.showNotification(mensaje, 'error');
        } else if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: mensaje,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(mensaje);
        }
    },

    bindNombreInput(selectorInput) {
        const el = document.querySelector(selectorInput);
        if (!el) return;
        el.setAttribute('maxlength', this.LIMITES.NOMBRE_MAX);
        el.addEventListener('input', function () {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
        });
    },

    bindTelefonoInput(selectorInput) {
        const el = document.querySelector(selectorInput);
        if (!el) return;
        el.setAttribute('maxlength', this.LIMITES.TELEFONO_EXACTO);
        el.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    },

    bindDniInput(selectorInput) {
        const el = document.querySelector(selectorInput);
        if (!el) return;
        el.setAttribute('maxlength', this.LIMITES.DNI_EXACTO);
        el.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    },

    bindDescripcionInput(selectorInput) {
        const el = document.querySelector(selectorInput);
        if (!el) return;
        el.setAttribute('maxlength', this.LIMITES.DESCRIPCION_MAX);
    },

    aplicarGlobal() {
        // ── Bloquear emojis en TODOS los campos ──────────────────────────
        document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea').forEach(el => {
            el.addEventListener('input', function () {
                const sinEmojis = Validation.quitarEmojis(this.value);
                if (sinEmojis !== this.value) {
                    this.value = sinEmojis;
                }
            });
        });

        // ── Nombres ──────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="nombre"], #nombreCliente').forEach(el => {
            el.setAttribute('maxlength', this.LIMITES.NOMBRE_MAX);
            el.addEventListener('input', function () {
                this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
            });
        });

        // ── Apellidos ────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="apellido"]').forEach(el => {
            el.setAttribute('maxlength', this.LIMITES.NOMBRE_MAX);
            el.addEventListener('input', function () {
                this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
            });
        });

        // ── Teléfono ─────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="telefono"]').forEach(el => {
            el.setAttribute('maxlength', this.LIMITES.TELEFONO_EXACTO);
            el.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        });

        // ── DNI / RUC ────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="dni"], #numeroDocumento').forEach(el => {
            if (el.id !== 'numeroDocumento') {
                el.setAttribute('maxlength', this.LIMITES.DNI_EXACTO);
            }
            el.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '');
            });
        });

        // ── Descripciones ────────────────────────────────────────────────────
        document.querySelectorAll('textarea[name="descripcion"], input[name="descripcion"]').forEach(el => {
            el.setAttribute('maxlength', this.LIMITES.DESCRIPCION_MAX);
        });

        // ── Usuario ──────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="usuario"]').forEach(el => {
            el.setAttribute('maxlength', this.LIMITES.USUARIO_MAX);
            el.addEventListener('input', function () {
                let limpio = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g, '');
                limpio = Validation.quitarEmojis(limpio);
                if (this.value !== limpio) {
                    this.value = limpio;
                }
            });
        });

        // ── Correo ───────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="correo"], input[type="email"], #clienteCorreo').forEach(el => {
            el.setAttribute('maxlength', this.LIMITES.CORREO_MAX);
        });

        // ── Clave ────────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="clave"], input[type="password"]').forEach(el => {
            el.setAttribute('maxlength', this.LIMITES.CLAVE_MAX);
            el.setAttribute('minlength', this.LIMITES.CLAVE_MIN);
        });

        // ─── ADUANA DE FECHAS SEGURA (Solo actúa donde le indiques) ───
        const hoyObj = new Date();
        const hoyStr = hoyObj.toISOString().split('T')[0];
        const minDateStr = '2026-06-01';

        // ─── 🚀 REEMPLAZAR ÚNICAMENTE ESTE BLOQUE DENTRO DE VALIDATION.JS ───

                // 1. SELECTOR ESTRICTO: Solo aplicamos la restricción de reservas a inputs con clase .input-fecha-reserva
                document.querySelectorAll('input[type="date"].input-fecha-reserva').forEach(el => {

                            const hoyAduana = new Date();
                            hoyAduana.setHours(0, 0, 0, 0);

                            const limiteFuturo = new Date();
                            limiteFuturo.setDate(limiteFuturo.getDate() + 11);
                            limiteFuturo.setHours(0, 0, 0, 0);

                            const minStr = hoyAduana.toISOString().split('T')[0];
                            const maxStr = limiteFuturo.toISOString().split('T')[0];

                            el.setAttribute('min', minStr);
                            el.setAttribute('max', maxStr);

                            el.addEventListener('change', function () {
                                if (!this.value) return;

                                // 🚀 TRUCO DE BLINDAJE ANTI-SABOTAJE: Separación por enteros locales
                                const partes = this.value.split('-');
                                const escogida = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                                escogida.setHours(0, 0, 0, 0);

                                if (escogida < hoyAduana || escogida > limiteFuturo) {
                                    Validation.mostrarError('🚨 Control de Reservas: La fecha debe estar comprendida entre hoy y máximo 11 días en el futuro.');
                                    this.value = '';

                                    const prefijo = this.id.charAt(0); // 'r' o 'e'
                                    if (typeof window.renderizarMatrizDiasDinamica === 'function') {
                                        window.renderizarMatrizDiasDinamica(prefijo);
                                    }
                                }
                            });
                        });

        // 2. REGISTRO HISTÓRICO ORDINARIO (Para el resto de inputs de tipo date)
        // Aplicamos esto a los date que NO sean reservas
        document.querySelectorAll('input[type="date"]:not(.input-fecha-reserva)').forEach(el => {
            el.setAttribute('min', minDateStr);
            el.setAttribute('max', hoyStr);

            el.addEventListener('change', function () {
                if (!this.value) return;

                // Convertimos a objetos fecha para comparar sin problemas de zona horaria
                const fechaSeleccionada = new Date(this.value + 'T00:00:00');
                const minDate = new Date(minDateStr + 'T00:00:00');
                const hoyValidacion = new Date();
                hoyValidacion.setHours(0, 0, 0, 0);

                if (fechaSeleccionada < minDate || fechaSeleccionada > hoyValidacion) {
                    Validation.mostrarError('La fecha debe estar entre el 01/06/2026 y hoy.');
                    this.value = ''; // Reseteamos si está fuera de rango
                }
            });
        });

        // ── Precios ──────────────────────────────────────────────────────────
        document.querySelectorAll('input[name="precio"]').forEach(el => {
            el.setAttribute('min', this.LIMITES.PRECIO_MIN);
            el.setAttribute('max', this.LIMITES.PRECIO_MAX);
            el.addEventListener('blur', function () {
                const val = parseFloat(this.value);
                if (this.value && (isNaN(val) || val < this.LIMITES.PRECIO_MIN || val > this.LIMITES.PRECIO_MAX)) {
                    Validation.mostrarError(`El precio debe estar entre S/ ${this.LIMITES.PRECIO_MIN}.00 y S/ ${this.LIMITES.PRECIO_MAX}.00.`);
                    this.value = '';
                }
            });
        });

        // ── Dirección Cliente ────────────────────────────────────────────────
        const inputDirCarta = document.getElementById('direccionCliente');
        if (inputDirCarta) {
            inputDirCarta.addEventListener('input', function () {
                let filtrado = this.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ #\-\.]/g, '');
                if (this.value !== filtrado) {
                    this.value = filtrado;
                }
            });
        }
    }
};

// Aplicar automáticamente al cargar cualquier página
document.addEventListener('DOMContentLoaded', function () {
    Validation.aplicarGlobal();
});