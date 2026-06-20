package com.web.restaurante.controller;

import com.web.restaurante.model.Notificacion;
import com.web.restaurante.model.Usuario;
import com.web.restaurante.repository.NotificacionRepository;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Controller
@RequestMapping("/admin/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionRepository notificacionRepository;

    /**
     * 🛰️ ENDPOINT API: Solo trae las que tengan LEIDO = 0 (o false)
     */
    @GetMapping("/api/listar-no-leidas")
    @ResponseBody
    public ResponseEntity<?> obtenerAlertasActivasApi(HttpSession session) {
        Usuario user = (Usuario) session.getAttribute("usuarioLogueado");
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Sesión inválida"));
        }

        String perfil = user.getPerfil().getNombre().toUpperCase();
        List<Notificacion> lista;

        // NOTA: Si usas findByDestinoPerfilIn... añade que filtre por leido = false si es necesario,
        // o lo filtramos aquí velozmente con Stream para no romper tus firmas del Repository:
        if (perfil.contains("ADMIN") || perfil.contains("SUPER")) {
            lista = notificacionRepository.findAllByOrderByFechaCreacionDesc();
        } else {
            lista = notificacionRepository.findByDestinoPerfilInOrderByFechaCreacionDesc(Arrays.asList("TODOS", "MESERO"));
        }

        // 🛡️ Filtro de seguridad: Solo enviamos las que NO han sido leídas
        List<Notificacion> noLeidas = lista.stream()
                .filter(n -> !n.isLeido()) // Asegúrate si tu entidad usa getLeido() o isLeido()
                .toList();

        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", noLeidas,
                "perfilActual", perfil
        ));
    }

    /**
     * ❌ ELIMINACIÓN INDIVIDUAL: Cambia el estado de una sola notificación por ID
     */
    @PostMapping("/api/marcar-leido-individual/{id}")
    @ResponseBody
    public ResponseEntity<?> marcarLeidoIndividual(@PathVariable Long id) {
        Optional<Notificacion> opt = notificacionRepository.findById(id);
        if (opt.isPresent()) {
            Notificacion n = opt.get();
            n.setLeido(true);
            notificacionRepository.save(n);
            return ResponseEntity.ok(Map.of("success", true, "message", "Notificación archivada"));
        }
        return ResponseEntity.status(404).body(Map.of("success", false, "message", "No encontrada"));
    }

    /**
     * 🧹 DESPEJAR TODO: Cambia a leídas las de la lista actual
     */
    @PostMapping("/api/marcar-leido")
    @ResponseBody
    public ResponseEntity<?> marcarTodoComoLeido() {
        List<Notificacion> pendientes = notificacionRepository.findAll();
        // Solo modificamos las que siguen activas
        List<Notificacion> modificar = pendientes.stream().filter(n -> !n.isLeido()).toList();
        modificar.forEach(n -> n.setLeido(true));
        notificacionRepository.saveAll(modificar);
        return ResponseEntity.ok(Map.of("success", true, "message", "🧹 Panel despejado"));
    }
}