package com.web.restaurante.controller;

import com.web.restaurante.model.DetallePedido;
import com.web.restaurante.model.Mesa;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.Producto;
import com.web.restaurante.model.InsumoProducto;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.repository.MesaRepository;
import com.web.restaurante.repository.PedidoRepository;
import com.web.restaurante.repository.ProductoRepository;
import com.web.restaurante.repository.InsumoProductoRepository;
import com.web.restaurante.service.PedidoService;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/mesero")
@RequiredArgsConstructor
public class MeseroController {

    private final ProductoRepository productoRepository;
    private final PedidoService pedidoService;
    private final MesaRepository mesaRepository;
    private final PedidoRepository pedidoRepository;

    // 🔥 Inyectamos el repositorio para leer las recetas y el stock
    private final InsumoProductoRepository insumoProductoRepository;

    @GetMapping("/nuevo")
    public String nuevoPedido(Model model, HttpSession session,
                              @RequestParam(required = false) Long mesaId,
                              @RequestParam(required = false) Long pedidoId) {
        if (session.getAttribute("usuarioLogueado") == null) return "redirect:/login";

        // ========================================================
        // 🔒 PERSISTENCIA EN SALA: Forzamos a que el sidebar crea que seguimos en Mesas
        // ========================================================
        model.addAttribute("activeUri", "/admin/mesas");
        model.addAttribute("titleHeader", "Comandera / Mesa N° " + (mesaId != null ? mesaId : ""));

        if (mesaId == null) {
            return "redirect:/admin/mesas";
        }

        List<Producto> listaProductos = productoRepository.findAll();

        // 🔥 MAPA DE STOCK: Almacenará qué productos están agotados
        Map<Long, Boolean> productosAgotados = new HashMap<>();

        for (Producto p : listaProductos) {
            boolean agotado = false;
            // Buscamos los ingredientes de este plato
            List<InsumoProducto> receta = insumoProductoRepository.findByProductoId(p.getId());

            for (InsumoProducto ip : receta) {
                // Solo nos importa bloquear si la PROTEÍNA se acabó
                if (ip.getInsumo() != null && "PROTEINA".equalsIgnoreCase(ip.getInsumo().getCategoria())) {
                    double stockActual = ip.getInsumo().getStockActual() != null ? ip.getInsumo().getStockActual() : 0.0;
                    double cantidadRequerida = ip.getCantidadUsada() != null ? ip.getCantidadUsada() : 0.0;

                    // Si el stock actual no alcanza ni para 1 porción, marcamos el plato como agotado
                    if (stockActual < cantidadRequerida) {
                        agotado = true;
                        break;
                    }
                }
            }
            productosAgotados.put(p.getId(), agotado);
        }

        model.addAttribute("productos", listaProductos);
        model.addAttribute("productosAgotados", productosAgotados); // Enviamos el mapa al frontend
        model.addAttribute("mesaId", mesaId);

        if (pedidoId != null) {
            model.addAttribute("pedidoId", pedidoId);
        }

        return "admin/mesero_pedido";
    }

    @PostMapping("/guardar")
    @ResponseBody
    public String guardarPedido(@RequestBody Pedido pedidoDeFrontend,
                                @RequestParam(required = false) Long mesaId,
                                HttpSession session) {
        try {
            System.out.println("\n===== [DEBUG RESTAURANTE: INICIO GUARDAR COMANDA] =====");
            System.out.println("DEBUG FRONTEND -> ID Recibido en JSON: " + pedidoDeFrontend.getId());
            System.out.println("DEBUG FRONTEND -> Cantidad de detalles en JSON: " +
                    (pedidoDeFrontend.getListaDetalles() != null ? pedidoDeFrontend.getListaDetalles().size() : 0));

            Pedido pedidoFinal;

            if (pedidoDeFrontend.getId() != null) {
                System.out.println("DEBUG BACKEND -> Es una ADICIÓN. Buscando ID original en BD: " + pedidoDeFrontend.getId());

                pedidoFinal = pedidoRepository.findById(pedidoDeFrontend.getId())
                        .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

                System.out.println("DEBUG BD -> Historial recuperado. Ítems guardados antes de fusionar: " + pedidoFinal.getListaDetalles().size());

                pedidoFinal.setEstado(EstadoPedido.EN_COCINA);
                pedidoFinal.setCliente(pedidoDeFrontend.getCliente());
                pedidoFinal.setDireccion(pedidoDeFrontend.getDireccion());

                // Se mantiene intacta la fechaCreacion original para proteger el inicio real del servicio

                if (pedidoDeFrontend.getListaDetalles() != null) {
                    for (DetallePedido nuevoDetalle : pedidoDeFrontend.getListaDetalles()) {
                        Producto productoCompleto = productoRepository.findById(nuevoDetalle.getProducto().getId())
                                .orElseThrow(() -> new RuntimeException("Producto no encontrado con ID: " + nuevoDetalle.getProducto().getId()));

                        nuevoDetalle.setProducto(productoCompleto);
                        nuevoDetalle.setPedido(pedidoFinal);
                        nuevoDetalle.setCocinado(false);

                        pedidoFinal.getListaDetalles().add(nuevoDetalle);
                        System.out.println("DEBUG ADICIÓN -> Fila insertada con producto hydratado: " +
                                productoCompleto.getNombre() + " | Categoría: " + productoCompleto.getCategoria().getNombre());
                    }
                }

            } else {
                System.out.println("DEBUG BACKEND -> ID es NULL. Creando un pedido completamente NUEVO desde cero.");
                pedidoFinal = pedidoDeFrontend;
                pedidoFinal.setEstado(EstadoPedido.EN_COCINA);
                pedidoFinal.setFechaCreacion(LocalDateTime.now());

                // Inicialización limpia de marcas temporales logísticas
                pedidoFinal.setFechaSalida(null);
                pedidoFinal.setFechaEntrega(null);

                if (pedidoFinal.getListaDetalles() != null) {
                    for (DetallePedido d : pedidoFinal.getListaDetalles()) {
                        Producto productoCompleto = productoRepository.findById(d.getProducto().getId())
                                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
                        d.setProducto(productoCompleto);
                        d.setCocinado(false);
                    }
                }
            }

            // =========================================================================
            // CONTROL LOGÍSTICO DE MESA: Evita pérdidas de datos o estados en local
            // =========================================================================
            if (mesaId != null) {
                // Caso A: Si llega mesaId explícito por la URL, asignamos y ocupamos la mesa
                Mesa mesa = mesaRepository.findById(mesaId).orElseThrow();
                pedidoFinal.setNumeroMesa(mesa.getNumero());
                mesa.setEstado("OCUPADA");
                mesaRepository.save(mesa);
                System.out.println("DEBUG MESA -> Asignada explícitamente: Mesa N° " + mesa.getNumero());
            } else if (pedidoDeFrontend.getId() != null) {
                // Caso B: Es una adición y no viajó mesaId en la URL. Conservamos la mesa que ya tenía la BD
                System.out.println("DEBUG MESA -> Manteniendo Mesa N° " + pedidoFinal.getNumeroMesa() + " heredada de la BD.");
            } else {
                // Caso C: Alerta de consistencia en el flujo
                System.out.println("DEBUG MESA -> ALERTA: No se recibió mesaId ni ID de comanda existente.");
            }

            boolean hayFrioPendiente = false;
            boolean hayCalientePendiente = false;

            if (pedidoFinal.getListaDetalles() != null) {
                for (DetallePedido d : pedidoFinal.getListaDetalles()) {
                    if (d.getProducto() != null && d.getProducto().getCategoria() != null) {
                        String cat = d.getProducto().getCategoria().getNombre().toUpperCase();

                        if ((cat.contains("FRI") || cat.contains("FRÍ")) && !d.isCocinado()) {
                            hayFrioPendiente = true;
                        }
                        if (cat.contains("CALIENTE") && !d.isCocinado()) {
                            hayCalientePendiente = true;
                        }
                    }
                }
            }

            pedidoFinal.setFrioListo(!hayFrioPendiente);
            pedidoFinal.setCalienteListo(!hayCalientePendiente);

            // CONTROL DE KPI DE DESPACHO EN COCINA:
            // Si el lote de platos frío y caliente está listo, se marca la fechaSalida de cocina
            if (!hayFrioPendiente && !hayCalientePendiente) {
                if (pedidoFinal.getFechaSalida() == null) {
                    pedidoFinal.setFechaSalida(LocalDateTime.now());
                    System.out.println("DEBUG LOGÍSTICA -> Cocina completada. Registrando fechaSalida automáticamente.");
                }
            } else {
                // Si entra una adición pendiente de preparación, se resetea hasta que todo vuelva a terminarse
                pedidoFinal.setFechaSalida(null);
            }

            double totalAcumulado = 0;
            if (pedidoFinal.getListaDetalles() != null) {
                for (DetallePedido detalle : pedidoFinal.getListaDetalles()) {
                    detalle.setPedido(pedidoFinal);

                    // Forzamos el seteo del precio unitario desde el producto hydratado si vino nulo
                    if (detalle.getPrecioUnitario() == null && detalle.getProducto() != null) {
                        detalle.setPrecioUnitario(detalle.getProducto().getPrecio());
                    }

                    // Seteamos explícitamente el subtotal llamando a nuestro método seguro
                    detalle.setSubtotal(detalle.getSubtotal());

                    totalAcumulado += detalle.getSubtotal();
                }
            }
            pedidoFinal.setMontoTotal(totalAcumulado);

            pedidoService.guardarPedido(pedidoFinal);

            // Forzar EN_COCINA directamente en BD por si @PrePersist pisó el estado
            if (pedidoFinal.getId() != null) {
                pedidoRepository.actualizarEstadoJPQL(pedidoFinal.getId(),
                        com.web.restaurante.model.enums.EstadoPedido.EN_COCINA);
            }

            System.out.println("DEBUG COMPLETO -> Pedido guardado con KPI actualizado. Total final en BD: S/. " + totalAcumulado + " | Ítems totales: " + pedidoFinal.getListaDetalles().size());
            System.out.println("===== [DEBUG RESTAURANTE: FIN GUARDAR COMANDA] =====\n");

            return "OK";
        } catch (Exception e) {
            e.printStackTrace();
            return "Error: " + e.getMessage();
        }
    }

    @PostMapping("/comanda/eliminar-item")
    @ResponseBody
    public ResponseEntity<String> eliminarItemDesdeSalon(@RequestParam Long pedidoId, @RequestParam Long detalleId) {
        try {
            pedidoService.eliminarItemComanda(pedidoId, detalleId);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // === KPI SALA: REGISTRO DE TRASLADO DE BANDEJA ===
    @PostMapping("/marcar-en-mesa/{id}")
    @ResponseBody
    public ResponseEntity<String> marcarPedidoEnMesa(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

            pedido.setFechaSalida(LocalDateTime.now());
            pedido.setEstado(EstadoPedido.ASIGNADO);

            pedidoRepository.save(pedido);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // === KPI ATENCIÓN: CIERRE DE COMANDA Y LIBERACIÓN OPERATIVA DE MESA ===
    @PostMapping("/finalizar-atencion/{id}")
    @ResponseBody
    public ResponseEntity<String> finalizarPedidoLocal(@PathVariable Long id, @RequestParam(required = false) Long mesaId) {
        try {
            Pedido pedido = pedidoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));

            pedido.setFechaEntrega(LocalDateTime.now());
            pedido.setEstado(EstadoPedido.PAGADO);

            pedidoRepository.save(pedido);

            if (mesaId != null) {
                Mesa mesa = mesaRepository.findById(mesaId).orElseThrow();
                mesa.setEstado("LIBRE");
                mesaRepository.save(mesa);
            }

            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/preparar-cuenta/{id}")
    @ResponseBody
    public ResponseEntity<String> prepararCuenta(@PathVariable Long id) {
        try {
            Pedido pedido = pedidoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Pedido no encontrado"));
            pedido.setEstado(EstadoPedido.PREPARADO);

            pedidoRepository.save(pedido);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}