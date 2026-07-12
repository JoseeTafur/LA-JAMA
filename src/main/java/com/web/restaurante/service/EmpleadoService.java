package com.web.restaurante.service;

import com.web.restaurante.model.*;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.repository.CargoRepository;
import com.web.restaurante.repository.EmpleadoRepository;
import com.web.restaurante.repository.PedidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class EmpleadoService {

    private final EmpleadoRepository empleadoRepository;
    private final CargoRepository cargoRepository;
    private final PedidoRepository pedidoRepository;
    private final TurnoCajaService turnoCajaService;

    
    @Transactional(readOnly = true)
    public List<Empleado> listarRepartidoresActivos() {
        return empleadoRepository.findByCargo_IdAndEstado(3L, 1);
    }

    
    @Transactional(readOnly = true)
    public List<Empleado> listar() {
        return empleadoRepository.listarNoEliminados();
    }

    @Transactional
    public void cobrarPedido(Long id) {
        Pedido pedido = pedidoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pedido no encontrado con ID: " + id));

        // 🚀 SEPARACIÓN DE PODERES: Marcamos el flujo financiero sin tocar el estado de cocina
        pedido.setEstadoPago(com.web.restaurante.model.enums.EstadoPago.PAGADO);

        // 🛡️ Aseguramos que la venta quede amarrada contablemente al turno activo
        try {
            turnoCajaService.obtenerTurnoActivo().ifPresent(pedido::setTurnoCaja);
        } catch (Exception e) {
            System.out.println("⚠️ [EMPLEADO SERVICE] No se pudo asignar el turno de caja: " + e.getMessage());
        }

        pedidoRepository.save(pedido);
        System.out.println("✅ [EMPLEADO SERVICE] Pedido #" + id + " cobrado con éxito (Estado de cocina respetado).");
    }

    
    @Transactional(readOnly = true)
    public Optional<Empleado> obtenerPorUsuario(Usuario usuario) {
        return empleadoRepository.findByUsuario(usuario);
    }

    
    @Transactional(readOnly = true)
    public Optional<Empleado> obtenerPorId(Long id) {
        return empleadoRepository.findById(id);
    }


    @Transactional
    public Empleado guardar(Empleado empleado) {

        // 🛡️ REGLA DE NEGOCIO: Máximo 5 empleados por cargo operativo
        if (empleado.getCargo() != null && empleado.getCargo().getId() != null) {
            // Contamos cuántos empleados activos (estado 1 o 0, excluyendo eliminados 2) tienen este cargo
            long totalConEsteCargo = empleadoRepository.listarNoEliminados().stream()
                    .filter(e -> e.getCargo() != null && e.getCargo().getId().equals(empleado.getCargo().getId()))
                    .count();

            if (empleado.getId() == null) {
                // Caso Nuevo: Si ya llegó al límite, se corta el paso
                if (totalConEsteCargo >= 5) {
                    throw new IllegalArgumentException("Cupo completo: El cargo seleccionado ya cuenta con el límite máximo de 5 colaboradores.");
                }
            } else {
                // Caso Edición: Buscamos el estado previo para ver si realmente está cambiando de puesto
                Empleado existente = empleadoRepository.findById(empleado.getId())
                        .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado"));

                boolean estaCambiandoDeCargo = existente.getCargo() == null || !existente.getCargo().getId().equals(empleado.getCargo().getId());

                // Si está migrando a un cargo nuevo y ese ya está lleno, bloqueamos
                if (estaCambiandoDeCargo && totalConEsteCargo >= 5) {
                    throw new IllegalArgumentException("Cupo completo: No se puede migrar al colaborador. El cargo destino ya cuenta con 5 empleados.");
                }
            }
        }

        // ========================================================
        // 💾 FLUJO DE PERSISTENCIA ORIGINAL CORREGIDO (Anti-Duplicate User)
        // ========================================================
        if (empleado.getId() != null) {
            Empleado existente = empleadoRepository.findById(empleado.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado para actualizar"));

            validarDuplicados(empleado);

            if (empleado.getUsuario() != null && empleado.getUsuario().getId() != null) {
                Optional<Empleado> empConUsuario = empleadoRepository.findByUsuario(empleado.getUsuario());
                if (empConUsuario.isPresent() && !empConUsuario.get().getId().equals(empleado.getId())) {
                    throw new IllegalArgumentException("La cuenta de usuario seleccionada ya está en uso por otro empleado.");
                }
                if (existente.getUsuario() != null && existente.getUsuario().getId().equals(empleado.getUsuario().getId())) {
                    empleado.setUsuario(existente.getUsuario());
                }
            }

            existente.setNombre(empleado.getNombre().trim());
            existente.setApellido(empleado.getApellido().trim());
            existente.setDni(empleado.getDni());
            existente.setTelefono(empleado.getTelefono());
            existente.setTurno(empleado.getTurno());
            existente.setFechaIngreso(empleado.getFechaIngreso());
            existente.setCargo(empleado.getCargo());
            existente.setUsuario(empleado.getUsuario());

            return empleadoRepository.save(existente);
        }

        validarDuplicados(empleado);

        if (empleado.getUsuario() != null && empleado.getUsuario().getId() != null) {
            if (empleadoRepository.findByUsuario(empleado.getUsuario()).isPresent()) {
                throw new IllegalArgumentException("La cuenta de usuario seleccionada ya está en uso por otro empleado.");
            }
        }

        if (empleado.getNombre() == null || empleado.getNombre().isBlank())
            throw new IllegalArgumentException("El nombre del empleado es obligatorio");
        if (empleado.getApellido() == null || empleado.getApellido().isBlank())
            throw new IllegalArgumentException("El apellido del empleado es obligatorio");

        empleado.setEstado(1);
        return empleadoRepository.save(empleado);
    }

    
    @Transactional
    public Empleado alternarEstado(Long id) {
        validarId(id);

        Empleado empleado = empleadoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado"));
        int nuevoEstado = empleado.getEstado() == 1 ? 0 : 1;
        empleadoRepository.actualizarEstado(id, nuevoEstado);
        empleado.setEstado(nuevoEstado);
        return empleado;
    }

    
    @Transactional
    public void eliminar(Long id) {
        validarId(id);

        Empleado empleado = empleadoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado"));
        empleadoRepository.actualizarEstado(id, 2);
    }

    
    @Transactional(readOnly = true)
    public long contar() {
        return empleadoRepository.contarActivos();
    }

    
    @Transactional(readOnly = true)
    public List<Empleado> buscarPorTermino(String termino) {
        if (termino == null || termino.isBlank())
            return listar();
        return empleadoRepository.buscarPorTermino(termino.trim());
    }

    
    @Transactional(readOnly = true)
    public List<Empleado> buscarPorTurno(String turno) {
        if (turno == null || turno.isBlank())
            return listar();
        return empleadoRepository.buscarPorTurno(turno.trim().toUpperCase());
    }

    
    @Transactional(readOnly = true)
    public List<Cargo> listarCargos() {
        return cargoRepository.listarActivos();
    }
    private void validarId(Long id) {
        if (id == null)
            throw new IllegalArgumentException("ID de empleado es null");
        if (id <= 0)
            throw new IllegalArgumentException("ID de empleado inválido");
    }

    private boolean esDniDuplicado(String dni, Long id) {
        return empleadoRepository.buscarPorDni(dni)
                .filter(e -> !e.getId().equals(id))
                .isPresent();
    }

    private void validarDuplicados(Empleado empleado) {
        if (empleado.getDni() != null && !empleado.getDni().isBlank()) {
            if (esDniDuplicado(empleado.getDni(), empleado.getId())) {
                throw new IllegalArgumentException("El DNI ya está registrado por otro empleado.");
            }
        }
    }
}
