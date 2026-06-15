package com.web.restaurante.config;

import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@RequiredArgsConstructor
@Component
public class SessionInterceptor implements HandlerInterceptor {

    private final RateLimitManager rateLimitManager;

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler) throws Exception {

        HttpSession session = request.getSession(false);
        String path = request.getServletPath();

        // ── 0. MURO DE CONTENCIÓN EXCLUSIVO (LOGIN / LOGOUT) ────────────────────────────────
        if ("/login".equals(path) || "/logout".equals(path)) {
            return true;
            /*
            String ip = request.getHeader("X-Forwarded-For");
            String claveIP = "IP_" + (ip == null || ip.isEmpty() ? request.getRemoteAddr() : ip.split(",")[0].trim());

            Bucket bucketAnonimo = rateLimitManager.obtenerBucket(claveIP, false);
            if (!bucketAnonimo.tryConsume(1)) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("text/plain;charset=UTF-8");
                response.getWriter().write("🚨 Demasiadas solicitudes en el acceso de La Jama.");
                return false;
            }
             */
            // Pasa directo al login/logout sin evaluar roles
        }

        String claveIdentificadora;
        boolean esAutenticado = false;

        if (session != null && session.getAttribute("usuarioLogueado") != null) {
            claveIdentificadora = "SESSION_" + session.getId();
            esAutenticado = true;
        } else {
            String ip = request.getHeader("X-Forwarded-For");
            claveIdentificadora = "IP_" + (ip == null || ip.isEmpty() ? request.getRemoteAddr() : ip.split(",")[0].trim());
        }

        // ── B. EVALUACIÓN DEL RATELIMIT ──────────────────────────────────────────────────
        Bucket bucket = rateLimitManager.obtenerBucket(claveIdentificadora, esAutenticado);

        if (!bucket.tryConsume(1)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write("🚨 Sistema saturado. Has excedido el límite de solicitudes permitido en La Jama.");
            return false;
        }

        // ── C. CONTROL DE ACCESOS COMPILADO Y LIMPIO ─────────────────────────────────────
        if (session == null || session.getAttribute("usuarioLogueado") == null) {
            response.sendRedirect("/login");
            return false;
        }

        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().trim().toUpperCase()
                : "INVITADO";

        // Pasaportes Supremos (SUPER_ADMIN y ADMIN entran a absolutamente todo)
        if ("SUPER_ADMIN".equals(rol) || "ADMIN".equals(rol)) return true;

        // ✨ PASAPORTE COMÚN: Permitir que cualquier usuario autenticado vea el Dashboard base
        if ("/dashboard".equals(path)) return true;

        // — Módulos de Caja, Despacho, Delivery y Catálogo de Productos
        if (path.startsWith("/admin/caja") ||
                path.startsWith("/admin/despacho") ||
                path.startsWith("/admin/productos") ||
                path.startsWith("/admin/pagos-digitales") ||
                path.startsWith("/delivery") ||
                path.startsWith("/historial")) {
            return verificar(rol, response, "CAJERO");
        }

        // — Módulos de Salón (Mesas y Comandas de mozos)
        if (path.startsWith("/admin/mesas") || path.startsWith("/admin/mesero")) {
            return verificar(rol, response, "MESERO");
        }

        // — Módulos de Producción (Monitores de Cocina)
        // 🚀 ADAPTADO: Permitimos que el rol COCINA también consuma la ruta de /insumos
        if (path.startsWith("/admin/cocina") ||
                path.startsWith("/insumos") ||
                path.startsWith("/proteinas")) {

            if ("COCINA".equals(rol)) {
                return true; // El cocinero tiene luz verde total para ver stocks y mermas
            }
            // Si es Cajero o Admin, se rige por su propia aduana o herencia superior
            if ("CAJERO".equals(rol)) return true;
        }

        // — Módulos de Despacho Logístico (Repartidores)
        if (path.startsWith("/admin/entregas") || path.startsWith("/entregas") || path.startsWith("/repartidor")) {
            return verificar(rol, response, "REPARTIDOR");
        }

        // ── 4. MURO DE CONTENCIÓN JERÁRQUICO DIRECTIVO (Solo para intrusos) ──────────────────────
        // 🚀 REPARADO: Removemos /proteinas de la lista negra global para no romper los fetches asíncronos
        if (path.startsWith("/usuarios") ||
                path.startsWith("/empleados") ||
                path.startsWith("/perfiles")) {
            response.sendRedirect("/dashboard?error=unauthorized");
            return false;
        }

        return true;
    }

    private boolean verificar(String rolActual, HttpServletResponse response, String rolRequerido) throws Exception {
        if (rolRequerido.equals(rolActual)) {
            return true;
        }
        response.sendRedirect("/dashboard?error=unauthorized");
        return false;
    }
}