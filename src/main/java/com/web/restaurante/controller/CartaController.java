package com.web.restaurante.controller;

import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Producto;
import com.web.restaurante.repository.CategoriaRepository;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.service.PedidoService;
import com.web.restaurante.service.YapePlinValidatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestPart;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class CartaController {

    private final ProductoRepository productoRepository;
    private final CategoriaRepository categoriaRepository;
    private final PedidoService pedidoService;
    private final InsumoProductoRepository insumoProductoRepository;

    // 🌟 INYECCIÓN DEL SERVICIO DE RECONOCIMIENTO OPTICO
    private final YapePlinValidatorService yapePlinValidatorService;

    @GetMapping("/carta")
    public String verCarta(Model model) {
        List<Producto> listaProductos = productoRepository.findByEstado(1);
        Map<Long, Boolean> productosAgotados = new HashMap<>();

        for (Producto p : listaProductos) {
            boolean agotado = false;
            List<InsumoProducto> receta = insumoProductoRepository.findByProductoId(p.getId());

            for (InsumoProducto ip : receta) {
                if (ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria())) {
                    double stockActual = ip.getInsumo().getStockActual() != null ? ip.getInsumo().getStockActual() : 0.0;
                    double cantidadRequerida = ip.getCantidadUsada() != null ? ip.getCantidadUsada() : 0.0;

                    if (stockActual < cantidadRequerida) {
                        agotado = true;
                        break;
                    }
                }
            }
            productosAgotados.put(p.getId(), agotado);
        }

        model.addAttribute("categorias", categoriaRepository.findAll());
        model.addAttribute("productos", listaProductos);
        model.addAttribute("productosAgotados", productosAgotados);

        return "entregas/carta";
    }

    @PostMapping(value = "/carta/pedido", consumes = {"multipart/form-data"})
    public ResponseEntity<?> recibirPedidoCarta(
            @RequestPart("pedido") Pedido pedido,
            @RequestPart(value = "voucher", required = false) org.springframework.web.multipart.MultipartFile file) {
        try {
            String metodo = pedido.getMetodoPago() != null ? pedido.getMetodoPago().name() : "EFECTIVO";

            if ("YAPE".equalsIgnoreCase(metodo) || "PLIN".equalsIgnoreCase(metodo)) {
                if (file == null || file.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", "🚨 Error: Falta adjuntar el voucher de pago."));
                }

                Double montoEsperado = pedido.getMontoTotal() != null ? pedido.getMontoTotal() : 0.0;
                Map<String, Object> validacion = yapePlinValidatorService.validarVoucher(file, montoEsperado, metodo, pedidoService);

                if (!(boolean) validacion.get("valido")) {
                    return ResponseEntity.badRequest().body(Map.of("success", false, "message", validacion.get("message")));
                }

                // ✨ LA MAGIA: El DNI/RUC del JSON original se mantiene a salvo en pedido.getDocumentoCliente(),
                // y el ID del OCR se guarda en el nuevo campo dedicado sin chanchar nada.
                pedido.setCodigoPagoOperacion((String) validacion.get("codigoPagoOperacion"));
            }

            Long id = pedidoService.guardarPedidoCarta(pedido);
            return ResponseEntity.ok(Map.of("success", true, "id", id));

        } catch (Exception e) {
            System.err.println("💥 Error general en pasarela: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("success", false, "message", "Error al procesar el pedido: " + e.getMessage()));
        }
    }
}