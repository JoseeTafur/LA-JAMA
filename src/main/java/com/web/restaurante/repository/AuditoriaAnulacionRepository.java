package com.web.restaurante.repository;

import com.web.restaurante.model.AuditoriaAnulacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AuditoriaAnulacionRepository extends JpaRepository<AuditoriaAnulacion, Long> {
    // Busca todas las notas de crédito que pertenezcan a un pedido específico
    List<AuditoriaAnulacion> findByPedidoId(Long pedidoId);
}