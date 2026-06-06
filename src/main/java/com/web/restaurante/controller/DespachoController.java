package com.web.restaurante.controller;

import com.web.restaurante.dto.PedidoMapaDTO;
import com.web.restaurante.model.Empleado;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.service.EmpleadoService;
import com.web.restaurante.service.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/admin/despacho")
@RequiredArgsConstructor
public class DespachoController {

    private final PedidoService pedidoService;
    private final EmpleadoService empleadoService;

    @GetMapping
    public String verPanelDespacho(Model model) {
        List<Pedido> todosPreparados = pedidoService.listarPreparadosParaDespacho();
        List<Empleado> repartidores = empleadoService.listarRepartidoresActivos();

        repartidores.forEach(r -> {
            if (r.getPedidos() != null) {
                r.getPedidos().removeIf(p ->
                        !p.getEstado().name().equals("EN_CAMINO") &&
                                !p.getEstado().name().equals("ASIGNADO")
                );
            }
        });

        List<PedidoMapaDTO> pedidosJS = todosPreparados.stream()
                .map(p -> new PedidoMapaDTO(p.getId(), p.getCliente(), p.getLatitud(), p.getLongitud()))
                .collect(Collectors.toList());

        model.addAttribute("pedidos", todosPreparados);
        model.addAttribute("pedidosJS", pedidosJS);
        model.addAttribute("repartidores", repartidores);

        return "admin/despacho";
    }

    @PostMapping("/asignar")
    @ResponseBody
    public ResponseEntity<?> asignarRuta(@RequestParam("pedidos") List<Long> pedidosIds,
                                         @RequestParam("repartidorId") Long repartidorId) {
        try {
            pedidoService.asignarRutaARepartidor(pedidosIds, repartidorId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
}