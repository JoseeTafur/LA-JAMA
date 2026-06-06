package com.web.restaurante.service;

import com.web.restaurante.model.Opcion;
import com.web.restaurante.model.Perfil;
import com.web.restaurante.repository.OpcionRepository;
import com.web.restaurante.repository.PerfilRepository;
import com.web.restaurante.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class    PerfilService {

    private final PerfilRepository perfilRepository;
    private final OpcionRepository opcionRepository;
    private final UsuarioRepository usuarioRepository;

    
    @Transactional(readOnly = true)
    public List<Perfil> listar() {
        return perfilRepository.findAllByEstadoNot(2);
    }

    
    @Transactional(readOnly = true)
    public Optional<Perfil> obtenerPorId(Long id) {
        return perfilRepository.findById(id);
    }

    
    @Transactional(readOnly = true)
    public Optional<Perfil> encontrarPorNombre(String nombre) {
        return perfilRepository.findByNombreIgnoreCase(nombre);
    }

    
    @Transactional
    public Perfil guardar(Perfil perfil) {
        if (perfil.getId() != null) {
            Perfil existente = perfilRepository.findById(perfil.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Perfil no encontrado para actualizar"));

            validarDuplicados(perfil);

            existente.setNombre(perfil.getNombre().trim());
            existente.setDescripcion(perfil.getDescripcion().trim());
            existente.setOpciones(perfil.getOpciones());

            return perfilRepository.save(existente);
        }

        validarDuplicados(perfil);

        return perfilRepository.save(perfil);
    }

    
    @Transactional
    public Perfil alternarEstado(Long id) {
        validarId(id);

        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Perfil no encontrado"));

        perfil.setEstado(perfil.getEstado() == 1 ? 0 : 1);
        return perfilRepository.save(perfil);
    }

    
    @Transactional
    public void eliminar(Long id) {
        validarId(id);

        long usuariosAsociados = usuarioRepository.countByPerfil_Id(id);
        if (usuariosAsociados > 0) {
            throw new IllegalArgumentException("No se puede eliminar el perfil, esta relacionado con uno o más usuarios");
        }

        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Perfil no encontrado"));

        perfil.setEstado(2);
        perfilRepository.save(perfil);
    }

    
    @Transactional(readOnly = true)
    public List<Opcion> listarOpciones() {
        return opcionRepository.findAll();
    }

    private boolean esNombreDuplicado(String nombre, Long id) {
        return perfilRepository.findByNombreIgnoreCase(nombre)
                .filter(p -> p.getEstado() != 2)
                .filter(p -> !p.getId().equals(id))
                .isPresent();
    }

    private void validarDuplicados(Perfil perfil) {
        if (esNombreDuplicado(perfil.getNombre(), perfil.getId())) {
            throw new IllegalArgumentException("Este nombre de perfil ya está en uso.");
        }
    }

    private void validarId(Long id) {
        if (id == null) throw new IllegalArgumentException("ID de perfil es null");
        if (id <= 0) throw new IllegalArgumentException("ID de perfil inválido");
    }
}
