package com.web.restaurante.repository;

import com.web.restaurante.model.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {
    List<Notificacion> findAllByOrderByFechaCreacionDesc();
    List<Notificacion> findByDestinoPerfilInOrderByFechaCreacionDesc(List<String> perfiles);
}