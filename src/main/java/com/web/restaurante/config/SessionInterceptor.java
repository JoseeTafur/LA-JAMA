package com.web.restaurante.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Interceptor de sesión y permisos por rol.
 *
 * Roles del sistema:
 *  - ADMIN      → acceso total
 *  - CAJERO     → caja, despacho, delivery, productos, pagos-digitales, historial
 *  - MESERO     → mesas, mesero
 *  - COCINA     → cocina (caliente/fría según cargo)
 *  - REPARTIDOR → admin/entregas/mis-pedidos
 *  - INVITADO   → solo dashboard
 *
 * Las rutas públicas (/login, /carta/**, recursos estáticos) ya están
 * excluidas en WebConfig.addInterceptors(), no se repiten aquí.
 */
@Component
public class SessionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler) throws Exception {

        HttpSession session = request.getSession(false);
        String path = request.getServletPath();

        // ── 1. Sin sesión → login ──────────────────────────────────────────────
        if (session == null || session.getAttribute("usuarioLogueado") == null) {
            response.sendRedirect("/login");
            return false;
        }

        // ── 2. Leer rol ────────────────────────────────────────────────────────
        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().trim().toUpperCase()
                : "INVITADO";

        // ADMIN pasa todo sin restricción
        if ("ADMIN".equals(rol)) {
            return true;
        }

        // ── 3. Tabla de permisos por prefijo de ruta ───────────────────────────

        // — Panel de Caja
        if (path.startsWith("/admin/caja")) {
            return verificar(rol, response, "CAJERO");
        }

        // — Panel de Despacho
        if (path.startsWith("/admin/despacho")) {
            return verificar(rol, response, "CAJERO");
        }

        // — Gestión de Productos / Almacén
        if (path.startsWith("/admin/productos")) {
            return verificar(rol, response, "CAJERO");
        }

        // — Pagos digitales
        if (path.startsWith("/admin/pagos-digitales")) {
            return verificar(rol, response, "CAJERO");
        }

        // — Delivery
        if (path.startsWith("/delivery")) {
            return verificar(rol, response, "CAJERO");
        }

        // — Historial de caja/ventas
        if (path.startsWith("/historial")) {
            return verificar(rol, response, "CAJERO");
        }

        // — Panel de Mesas
        if (path.startsWith("/admin/mesas")) {
            return verificar(rol, response, "MESERO");
        }

        // — Panel de Mesero / comandas
        if (path.startsWith("/admin/mesero")) {
            return verificar(rol, response, "MESERO");
        }

        // — Panel de Cocina
        if (path.startsWith("/admin/cocina")) {
            return verificar(rol, response, "COCINA");
        }

        // — Entregas / repartidor
        if (path.startsWith("/admin/entregas") || path.startsWith("/entregas") || path.startsWith("/repartidor")) {
            return verificar(rol, response, "REPARTIDOR");
        }

        // — Gestión de Usuarios, Empleados y Perfiles (solo ADMIN — ya cubierto arriba)
        if (path.startsWith("/usuarios") || path.startsWith("/empleados") || path.startsWith("/perfiles")) {
            response.sendRedirect("/dashboard?error=unauthorized");
            return false;
        }

        // — Insumos y Proteínas (solo ADMIN)
        if (path.startsWith("/insumos") || path.startsWith("/proteinas")) {
            response.sendRedirect("/dashboard?error=unauthorized");
            return false;
        }

        // ── 4. Resto de rutas (dashboard, APIs públicas) → permitir ───────────
        return true;
    }

    /**
     * Comprueba que el rol actual coincida con el rol requerido.
     * Si no coincide, redirige a /dashboard?error=unauthorized.
     */
    private boolean verificar(String rolActual, HttpServletResponse response, String rolRequerido) throws Exception {
        if (rolRequerido.equals(rolActual)) {
            return true;
        }
        response.sendRedirect("/dashboard?error=unauthorized");
        return false;
    }
}