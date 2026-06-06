package com.web.restaurante.controller;

import com.web.restaurante.model.Pedido;
import com.web.restaurante.repository.CategoriaRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.PedidoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@Controller
@RequiredArgsConstructor
public class CartaController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final PedidoService pedidoService;

    @GetMapping("/carta")
    public String verCarta(Model model) {
        model.addAttribute("categorias", categoriaRepository.findAll());
        model.addAttribute("productos", productoRepository.findByEstado(1));
        return "entregas/carta";
    }

    @PostMapping("/carta/pedido")
    public ResponseEntity<?> recibirPedidoCarta(@RequestBody Pedido pedido) {
        pedidoService.guardarPedido(pedido);
        return ResponseEntity.ok().build();
    }
}