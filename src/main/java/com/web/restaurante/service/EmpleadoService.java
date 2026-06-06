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
        pedidoRepository.actualizarEstadoJPQL(id, EstadoPedido.PAGADO);
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

        if (empleado.getId() != null) {
            Empleado existente = empleadoRepository.findById(empleado.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Empleado no encontrado para actualizar"));

            validarDuplicados(empleado);

            existente.setNombre(empleado.getNombre().trim());
            existente.setApellido(empleado.getApellido().trim());
            existente.setDni(empleado.getDni());
            existente.setTelefono(empleado.getTelefono());
            existente.setTurno(empleado.getTurno());
            existente.setTipoContrato(empleado.getTipoContrato());
            existente.setFechaIngreso(empleado.getFechaIngreso());
            existente.setCargo(empleado.getCargo());
            existente.setUsuario(empleado.getUsuario());

            return empleadoRepository.save(existente);
        }

        validarDuplicados(empleado);

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
