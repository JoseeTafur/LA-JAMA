package com.web.restaurante.util;

import java.time.LocalDate;

public class ValidationUtil {

    // ── Límites globales del sistema ──────────────────────────────────────────
    public static final int NOMBRE_MAX       = 30;
    public static final int APELLIDO_MAX     = 30;
    public static final int DESCRIPCION_MAX  = 150;
    public static final int CORREO_MAX       = 40;
    public static final int USUARIO_MAX      = 30;
    public static final int CLAVE_MIN        = 6;
    public static final int CLAVE_MAX        = 30;
    public static final int TELEFONO_EXACTO  = 9;
    public static final int DNI_EXACTO       = 8;
    public static final double PRECIO_MIN    = 10.0;
    public static final double PRECIO_MAX    = 70.0;

    private static final String REGEX_SOLO_LETRAS  = "^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$";
    private static final String REGEX_SOLO_NUMEROS = "^[0-9]+$";

    private ValidationUtil() {}

    /** Solo letras, espacios y acentos */
    public static boolean soloLetras(String texto) {
        if (texto == null || texto.isBlank()) return false;
        return texto.trim().matches(REGEX_SOLO_LETRAS);
    }

    /** Solo dígitos */
    public static boolean soloNumeros(String texto) {
        if (texto == null || texto.isBlank()) return false;
        return texto.trim().matches(REGEX_SOLO_NUMEROS);
    }

    /** Longitud máxima */
    public static boolean longitudValida(String texto, int max) {
        return texto != null && texto.trim().length() <= max;
    }

    /** Precio entre PRECIO_MIN y PRECIO_MAX */
    public static boolean precioValido(Double precio) {
        return precio != null && precio >= PRECIO_MIN && precio <= PRECIO_MAX;
    }

    /** Teléfono peruano: exactamente 9 dígitos */
    public static boolean telefonoValido(String telefono) {
        if (telefono == null || telefono.isBlank()) return true; // opcional
        return telefono.trim().matches("^[0-9]{" + TELEFONO_EXACTO + "}$");
    }

    /** DNI: exactamente 8 dígitos */
    public static boolean dniValido(String dni) {
        if (dni == null || dni.isBlank()) return true; // opcional
        return dni.trim().matches("^[0-9]{" + DNI_EXACTO + "}$");
    }

    /** Correo con formato básico y longitud máxima */
    public static boolean correoValido(String correo) {
        if (correo == null || correo.isBlank()) return false;
        return correo.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
                && correo.trim().length() <= CORREO_MAX;
    }

    /** Fecha entre 1950 y hoy */
    public static boolean fechaDentroDeRango(LocalDate fecha) {
        if (fecha == null) return false;
        return !fecha.isBefore(LocalDate.of(1999, 1, 1)) && !fecha.isAfter(LocalDate.now());
    }

    /** Alias para compatibilidad */
    public static boolean fechaRazonable(LocalDate fecha) {
        return fechaDentroDeRango(fecha);
    }

    /** No nulo ni vacío */
    public static boolean noVacio(String texto) {
        return texto != null && !texto.isBlank();
    }
}