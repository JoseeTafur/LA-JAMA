package com.web.restaurante.service;

import com.web.restaurante.dto.pago.ObservacionDTO;
import com.web.restaurante.dto.pago.PagoDigitalDTO;
import com.web.restaurante.dto.pago.PagoDigitalSaveDTO;
import com.web.restaurante.dto.pago.PagoImagenSaveDTO;
import com.web.restaurante.mapper.PagoDigitalMapper;
import com.web.restaurante.model.PagoDigital;
import com.web.restaurante.model.Pedido;
import com.web.restaurante.model.enums.EstadoPedido;
import com.web.restaurante.model.enums.SituacionPagoDigital;
import com.web.restaurante.repository.PagoDigitalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PagoDigitalService {

    private final PagoDigitalRepository pagoDigitalRepository;
    private final PagoDigitalMapper pagoDigitalMapper;
    private final PedidoService pedidoService;

    @Transactional(readOnly = true)
    public List<PagoDigitalDTO> listarTodos() {
        return pagoDigitalRepository.findAll()
                .stream().map(pagoDigitalMapper::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public List<PagoDigitalDTO> listarPendientes() {
        return pagoDigitalRepository.findAllBySituacion(SituacionPagoDigital.PENDIENTE)
                .stream().map(pagoDigitalMapper::toDTO).toList();
    }

    @Transactional(readOnly = true)
    public PagoDigitalDTO obtener(Long id) {
        return pagoDigitalMapper.toDTO(requerirPagoPorId(id));
    }

    @Transactional
    public PagoDigitalDTO crear(PagoDigitalSaveDTO dto) {
        Pedido pedido = pedidoService.requerirPedidoPorId(dto.idPedido());

        PagoDigital pagoDigital = PagoDigital.builder()
                .pedido(pedido)
                .observacion(dto.observacion())
                .imgUrl(dto.imgUrl())
                .build();

        return pagoDigitalMapper.toDTO(pagoDigitalRepository.save(pagoDigital));
    }

    @Transactional
    public PagoDigitalDTO actualizar(PagoDigitalSaveDTO dto, Long id) {
        PagoDigital pago = requerirPagoPorId(id);

        pago.setObservacion(dto.observacion());
        pago.setImgUrl(dto.imgUrl());

        return pagoDigitalMapper.toDTO(pagoDigitalRepository.save(pago));
    }

    @Transactional
    public PagoDigitalDTO actualizarImagen(PagoImagenSaveDTO dto, Long id) {
        PagoDigital pago = requerirPagoPorId(id);
        pago.setImgUrl(dto.imgUrl());

        return pagoDigitalMapper.toDTO(pagoDigitalRepository.save(pago));
    }

    @Transactional
    public PagoDigitalDTO aprobar(ObservacionDTO dto, Long id) {
        PagoDigital pago = requerirPagoPorId(id);

        pago.setObservacion(dto.observacion());
        pago.setSituacion(SituacionPagoDigital.APROBADO);

        pedidoService.cambiarEstadoA(EstadoPedido.PENDIENTE, pago.getPedido().getId());

        return pagoDigitalMapper.toDTO(pagoDigitalRepository.save(pago));
    }

    @Transactional
    public PagoDigitalDTO anular(ObservacionDTO dto, Long id) {
        PagoDigital pago = requerirPagoPorId(id);

        pago.setObservacion(dto.observacion());
        pago.setSituacion(SituacionPagoDigital.ANULADO);

        pedidoService.cambiarEstadoA(EstadoPedido.CANCELADO, pago.getPedido().getId());

        return pagoDigitalMapper.toDTO(pagoDigitalRepository.save(pago));
    }

    @Transactional(readOnly = true)
    public PagoDigital requerirPagoPorId(Long id) {
        return pagoDigitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("No se encontró pago digital con esa ID"));
    }
}
