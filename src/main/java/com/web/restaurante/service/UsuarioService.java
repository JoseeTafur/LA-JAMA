package com.web.restaurante.service;

import com.web.restaurante.model.Usuario;
import com.web.restaurante.repository.UsuarioRepository;
import com.web.restaurante.repository.PerfilRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@RequiredArgsConstructor
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final PerfilRepository perfilRepository;

    
    @Transactional(readOnly = true)
    public List<Usuario> listar() {
        return usuarioRepository.findAllByEstadoNot(2);
    }

    
    @Transactional (readOnly = true)
    public Optional<Usuario> obtenerPorId(Long id) {
        return usuarioRepository.findById(id);
    }

    
    @Transactional(readOnly = true)
    public Optional<Usuario> encontrarPorUsuario(String usuario) {
        return usuarioRepository.findByUsuario(usuario);
    }

    
    @Transactional
    public Usuario guardar(Usuario usuario) {

        if (usuario.getId() != null) {
            Usuario existente = usuarioRepository.findById(usuario.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado para actualizar"));

            validarDuplicados(usuario);

            existente.setUsuario(usuario.getUsuario());
            existente.setCorreo(usuario.getCorreo());
            existente.setPerfil(usuario.getPerfil());

            if (!esClaveVacia(usuario.getClave())) {
                existente.setClave(passwordEncoder.encode(usuario.getClave().trim()));
            }

            return usuarioRepository.save(existente);
        }

        validarDuplicados(usuario);
        validarClave(usuario.getClave());

        // Máximo 3 administradores — buscamos el perfil por id para leer su nombre real
        if (usuario.getPerfil() != null && usuario.getPerfil().getId() != null) {
            perfilRepository.findById(usuario.getPerfil().getId()).ifPresent(perfil -> {
                if ("Administrador".equalsIgnoreCase(perfil.getNombre())) {
                    long totalAdmins = usuarioRepository.countByPerfil_NombreIgnoreCaseAndEstadoNot("Administrador", 2);
                    if (totalAdmins >= 3) {
                        throw new IllegalArgumentException("No se pueden registrar más de 3 administradores.");
                    }
                }
            });
        }

        usuario.setClave(passwordEncoder.encode(usuario.getClave().trim()));
        return usuarioRepository.save(usuario);
    }

    
    @Transactional
    public Usuario alternarEstado(Long id) {
        validarId(id);

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        usuario.setEstado(usuario.getEstado() == 1 ? 0 : 1);
        return usuarioRepository.save(usuario);
    }

    
    @Transactional
    public void eliminar(Long id) {
        validarId(id);

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        // No se puede eliminar un administrador
        if (usuario.getPerfil() != null && usuario.getPerfil().getId() != null) {
            perfilRepository.findById(usuario.getPerfil().getId()).ifPresent(perfil -> {
                if ("Administrador".equalsIgnoreCase(perfil.getNombre())) {
                    throw new IllegalArgumentException("No está permitido eliminar una cuenta de administrador.");
                }
            });
        }

        usuario.setEstado(2);
        usuarioRepository.save(usuario);
    }

    
    @Transactional(readOnly = true)
    public long contar() {
        return usuarioRepository.countByEstadoNot(2);
    }

    
    public boolean verificarClave(String claveTextoPlano, String claveEncriptada) {
        return passwordEncoder.matches(claveTextoPlano, claveEncriptada);
    }

    private boolean esUsuarioDuplicado(String username, Long id) {
        // Buscamos todos los usuarios activos que coincidan con el login
        List<Usuario> coincidencias = usuarioRepository.findByUsuarioIgnoreCase(username);

        // Es un duplicado real si hay coincidencia, no está eliminado (estado != 2)
        // y pertenece a un ID diferente al que estamos editando actualmente
        return coincidencias.stream()
                .filter(u -> u.getEstado() != 2)
                .anyMatch(u -> !u.getId().equals(id));
    }

    private boolean esCorreoDuplicado(String correo, Long id) {
        // Buscamos todas las coincidencias de correo en la base de datos
        List<Usuario> coincidencias = usuarioRepository.findByCorreoIgnoreCase(correo);

        // Es duplicado si el correo ya existe en una cuenta viva que no sea la nuestra
        return coincidencias.stream()
                .filter(u -> u.getEstado() != 2)
                .anyMatch(u -> !u.getId().equals(id));
    }

    private void validarDuplicados(Usuario usuario) {
        if (esUsuarioDuplicado(usuario.getUsuario(), usuario.getId())) {
            throw new IllegalArgumentException("Este usuario ya está en uso por otra cuenta activa.");
        }

        if (esCorreoDuplicado(usuario.getCorreo(), usuario.getId())) {
            throw new IllegalArgumentException("El correo ya está en uso por otra cuenta activa.");
        }
    }

    private void validarId(Long id) {
        if (id == null) throw new IllegalArgumentException("ID de usuario es null");
        if (id <= 0) throw new IllegalArgumentException("ID de usuario inválido");
    }

    private boolean esClaveVacia(String clave) {
        return clave == null || clave.trim().isEmpty();
    }

    private void validarClave(String clave) {
        if (clave == null) throw new IllegalArgumentException("La clave es null");
        if (clave.trim().isEmpty()) throw new IllegalArgumentException("La clave está vacía");
    }
}