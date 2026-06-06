package com.web.restaurante.service;

import com.web.restaurante.model.Usuario;
import com.web.restaurante.repository.UsuarioRepository;
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
        return usuarioRepository.findByUsuarioIgnoreCase(usuario);
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

    private boolean esUsuarioDuplicado(String usuario, Long id) {
        return usuarioRepository.findByUsuarioIgnoreCase(usuario)
                .filter(u -> u.getEstado() != 2)
                .filter(u -> !u.getId().equals(id))
                .isPresent();
    }

    private boolean esCorreoDuplicado(String correo, Long id) {
        return usuarioRepository.findByCorreoIgnoreCase(correo)
                .filter(u -> u.getEstado() != 2)
                .filter(u -> !u.getId().equals(id))
                .isPresent();
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
