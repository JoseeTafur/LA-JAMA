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

import java.time.LocalDateTime;

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
        String queryString = request.getQueryString();

        // =========================================================================
        // 🛡️ PASAPORTE DE INMUNIDAD ABSOLUTO (ANTI-BUCLE DE REDIRECCIONES)
        // =========================================================================
        // Si la URL ya avisa que viene redirigida por saturación, se le da salvoconducto
        // inmediato al HTML para que cargue la interfaz y salte el cartel de SweetAlert.
        if (queryString != null && queryString.contains("error=ratelimit")) {
            return true;
        }

        // ── 0. MURO DE CONTENCIÓN EXCLUSIVO (LOGIN / LOGOUT) ────────────────────────────────
        if ("/login".equals(path) || "/logout".equals(path)) {
            String ip = request.getHeader("X-Forwarded-For");
            String claveIP = "IP_" + (ip == null || ip.isEmpty() ? request.getRemoteAddr() : ip.split(",")[0].trim());

            Bucket bucketAnonimo = rateLimitManager.obtenerBucket(claveIP, false);

            if (!bucketAnonimo.tryConsume(1)) {
                manejadorBloqueoRateLimit(request, response, session);
                return false; // Bloquea el ataque de ráfagas
            }

            return true;
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
            manejadorBloqueoRateLimit(request, response, session);
            return false; // Frena la saturación
        }

        // ── C. CONTROL DE ACCESOS COMPILADO Y LIMPIO ─────────────────────────────────────
        if (session == null || session.getAttribute("usuarioLogueado") == null) {
            response.sendRedirect("/login");
            return false;
        }

        // ✨ PASAPORTE UNIVERSAL AUTENTICADO: Cualquier trabajador con sesión iniciada
        // puede consumir el Dashboard base o su interfaz de Perfil Personal sin restricciones.
        if ("/dashboard".equals(path) ||
                "/admin/MiPerfil".equals(path) ||
                "/admin/sidebar".equals(path) ||
                "admin/sidebar".equals(path)) {
            return true;
        }

        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().trim().toUpperCase()
                : "INVITADO";

        // Pasaportes Supremos (SUPER_ADMIN y ADMIN entran a absolutamente todo)
        if ("SUPER_ADMIN".equals(rol) || "ADMIN".equals(rol)) return true;

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
        if (path.startsWith("/admin/cocina") ||
                path.startsWith("/insumos") ||
                path.startsWith("/proteinas")) {

            if ("COCINA".equals(rol)) return true;
            if ("CAJERO".equals(rol)) return true;
        }

        // — Módulos de Despacho Logístico (Repartidores / Distribuidor)
        if (path.startsWith("/admin/entregas") || path.startsWith("/entregas") || path.startsWith("/repartidor")) {
            if ("SUPER_ADMIN".equals(rol) || "ADMIN".equals(rol)) return true;
            return verificar(rol, response, "REPARTIDOR");
        }

        // ── 4. MURO DE CONTENCIÓN JERÁRQUICO DIRECTIVO
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

    /**
     * 🛰️ INYECTOR DE RESPUESTA INTELIGENTE ANTI-PÁGINA RANCIA
     * Detecta el origen de la saturación y decide si inyecta JSON comercial o redirige la pantalla.
     */
    private void manejadorBloqueoRateLimit(HttpServletRequest request, HttpServletResponse response, HttpSession session) throws Exception {
        String acceptHeader = request.getHeader("Accept");
        String requestedWith = request.getHeader("X-Requested-With");

        boolean esPeticionJson = (acceptHeader != null && acceptHeader.contains("application/json")) ||
                "XMLHttpRequest".equals(requestedWith);

        if (esPeticionJson) {
            // 🛒 CASO A: Es un fetch/clic veloz. Mandamos JSON limpio para que AppUtils lo pinte en la comanda
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value()); // HTTP 429
            response.setContentType("application/json;charset=UTF-8");

            String jsonError = "{\"success\": false, \"message\": \"Has hecho demasiadas solicitudes en un lapso corto de tiempo. ¡Ve despacio, La Jama está procesando!\"}";
            response.getWriter().write(jsonError);
            System.out.println("🚨 [RATE LIMIT] Petición JSON bloqueada de forma conforme por saturación.");
        } else {
            // 🏪 CASO B: Es una recarga F5 total de navegador. Redirigimos elegantemente con bandera de error
            String rutaDestino = (session != null && session.getAttribute("usuarioLogueado") != null)
                    ? "/dashboard?error=ratelimit"
                    : "/login?error=ratelimit";

            response.sendRedirect(rutaDestino);
            System.out.println("🚨 [RATE LIMIT] Navegación web redirigida de forma estética a: " + rutaDestino);
        }
    }
}