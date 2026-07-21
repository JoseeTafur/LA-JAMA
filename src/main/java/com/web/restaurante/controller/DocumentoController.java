package com.web.restaurante.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/documentos")
public class DocumentoController {

    @Value("${miapi.token:}")
    private String apiToken;

    @Value("${miapi.url.ruc:https://miapi.cloud/v1/ruc/}")
    private String rucApiUrl;

    @Value("${miapi.url.dni:https://miapi.cloud/v1/dni/}")
    private String dniApiUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping(value = "/dni/{numeroDni}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> consultarDni(@PathVariable String numeroDni) {
        String urlFinal = dniApiUrl + numeroDni;
        return ejecutarConsultaConBearer(urlFinal);
    }

    @GetMapping(value = "/ruc/{numeroRuc}", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> consultarRuc(@PathVariable String numeroRuc) {
        String urlFinal = rucApiUrl + numeroRuc;
        return ejecutarConsultaConBearer(urlFinal);
    }

    /**
     * Centraliza la comunicación HTTP inyectando las cabeceras de autorización exigidas
     */
    private ResponseEntity<?> ejecutarConsultaConBearer(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + apiToken);
            headers.setContentType(MediaType.APPLICATION_JSON);

            headers.add("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            System.err.println("💥 Error en comunicación con miapi.cloud: " + e.getMessage());
            return ResponseEntity.status(500).body("{\"error\": \"No se pudo procesar la consulta en los servidores oficiales.\"}");
        }
    }
}