package com.web.restaurante.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * LA JAMA — SessionInterceptor
 * Interceptor de sesión y control perimetral de accesos con jerarquía SUPER_ADMIN.
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

        // ── 1. ADUANA ESTRUCTURAL: Sin sesión activa → Redirección limpia al Login ─────────────────
        if (session == null || session.getAttribute("usuarioLogueado") == null) {
            response.sendRedirect("/login");
            return false;
        }

        // ── 2. EXTRACCIÓN DE PRIVILEGIOS DE LA SESIÓN ───────────────────────────────────────────
        String rol = session.getAttribute("rol") != null
                ? session.getAttribute("rol").toString().trim().toUpperCase()
                : "INVITADO";

        // 🔥 PASAPORTE SUPREMO: El rango SUPER_ADMIN posee inmunidad total sobre cualquier recurso
        if ("SUPER_ADMIN".equals(rol)) {
            return true;
        }

        // 🔥 PASAPORTE ADMINISTRATIVO: El rango ADMIN hereda acceso total sobre todo el ecosistema
        if ("ADMIN".equals(rol)) {
            return true;
        }

        // ── 3. MATRIZ DE PERMISOS PARA ROLES OPERATIVOS MENORES ───────────────────────────
        // (Al haber escapado SUPER_ADMIN y ADMIN arriba, aquí solo evalúa operarios estrictos)

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
        if (path.startsWith("/admin/cocina")) {
            return verificar(rol, response, "COCINA");
        }

        // — Módulos de Despacho Logístico (Repartidores)
        if (path.startsWith("/admin/entregas") || path.startsWith("/entregas") || path.startsWith("/repartidor")) {
            return verificar(rol, response, "REPARTIDOR");
        }

        // ── 4. MURO DE CONTENCIÓN JERÁRQUICO DIRECTIVO ─────────────────────────────────────────
        // Si la petición llegó hasta aquí y es de rango menor (Cajero, Mozo, Cocinero),
        // se le deniega el acceso inmediato a planillas, configuraciones de sistema o insumos de almacén.
        if (path.startsWith("/usuarios") ||
                path.startsWith("/empleados") ||
                path.startsWith("/perfiles") ||
                path.startsWith("/insumos") ||
                path.startsWith("/proteinas")) {
            response.sendRedirect("/dashboard?error=unauthorized");
            return false;
        }

        // ── 5. RUTAS GENERALES LIBRES (Dashboard, APIs informativas de sesión, etc.) ───────────────
        return true;
    }

    /**
     * Valida si el operario estricto en sesión coincide con la ruta requerida.
     * Si no cumple la firma, efectúa el rebote preventivo al panel de control.
     */
    private boolean verificar(String rolActual, HttpServletResponse response, String rolRequerido) throws Exception {
        if (rolRequerido.equals(rolActual)) {
            return true;
        }
        response.sendRedirect("/dashboard?error=unauthorized");
        return false;
    }
}