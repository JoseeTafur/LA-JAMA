package com.web.restaurante.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class SessionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull Object handler) throws Exception {
        HttpSession session = request.getSession(false);
        String path = request.getServletPath();

        if (session == null || session.getAttribute("usuarioLogueado") == null) {
            response.sendRedirect("/login");
            return false;
        }

        String rol = (session.getAttribute("rol") != null)
                ? session.getAttribute("rol").toString().trim().toUpperCase() : "INVITADO";

        if ("ADMIN".equals(rol)) {
            return true;
        }

        if (path.startsWith("/entregas") || path.startsWith("/repartidor")) {
            if (!"REPARTIDOR".equals(rol)) {
                response.sendRedirect("/dashboard?error=unauthorized");
                return false;
            }
        }

        if (path.startsWith("/admin/caja") || path.startsWith("/admin/despacho") || path.startsWith("/admin/productos")) {
            if (!"CAJERO".equals(rol)) {
                response.sendRedirect("/dashboard?error=unauthorized");
                return false;
            }
        }

        if (path.startsWith("/usuarios") || path.startsWith("/empleados") || path.startsWith("/perfiles")) {
            if (!"ADMIN".equals(rol)) {
                response.sendRedirect("/dashboard?error=unauthorized");
                return false;
            }
        }

        if (path.startsWith("/admin/cocina")) {
            if (!"COCINA".equals(rol)) {
                response.sendRedirect("/dashboard?error=denied");
                return false;
            }
        }

        if (path.startsWith("/admin/mesero")) {
            if (!"MESERO".equals(rol)) {
                response.sendRedirect("/dashboard?error=denied");
                return false;
            }
        }
        if (session == null || session.getAttribute("usuarioLogueado") == null) {
    // ✅ AGREGA ESTO — rutas públicas sin login
    if (path.equals("/carta") || path.startsWith("/imagenes")) {
        return true;
    }
    response.sendRedirect("/login");
    return false;
}

        return true;
    }
}