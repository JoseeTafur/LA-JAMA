package com.web.restaurante.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
@RequiredArgsConstructor
public class GroqService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.groq.token}")
    private String apiKeyGroq;

    @Value("${app.groq.url}")
    private String urlGroq;

    public Map<String, Object> analizarImagenVoucher(String urlImagenSecure) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKeyGroq);

        String promptEstrategico = "Analiza esta captura de pantalla de un pago o voucher. " +
                "Extrae los datos exactos y responde EXCLUSIVAMENTE con un objeto JSON válido. " +
                "Si un dato no es visible, pon null. " +
                "Estructura requerida: " +
                "{ " +
                "  \"destino\": \"YAPE\", \"PLIN\" o \"TRANSFERENCIA\", " +
                "  \"dia\": número entero, " +
                "  \"mes\": \"ene\", \"feb\", \"mar\", \"abr\", \"may\", \"jun\", \"jul\", \"ago\", \"sep\", \"oct\", \"nov\" o \"dic\", " +
                "  \"anio\": número entero de 2 dígitos, " +
                "  \"numero_operacion\": \"string del número de operación\", " +
                "  \"monto\": número decimal (float) " +
                "}";

        // Estructuración del body para Groq usando la URL segura de Cloudinary
        Map<String, Object> textContent = Map.of("type", "text", "text", promptEstrategico);
        Map<String, Object> imageContent = Map.of("type", "image_url", "image_url", Map.of("url", urlImagenSecure));

        Map<String, Object> message = Map.of(
                "role", "user",
                "content", List.of(textContent, imageContent)
        );

        Map<String, Object> body = new HashMap<>();
        body.put("model", "qwen/qwen3.6-27b");
        body.put("messages", List.of(message));
        body.put("temperature", 0.1);
        body.put("max_tokens", 512);
        body.put("response_format", Map.of("type", "json_object"));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(urlGroq, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Error en respuesta de Groq Cloud HTTP: " + response.getStatusCode());
            }

            // Parsear la respuesta de la API de Groq
            JsonNode rootNode = objectMapper.readTree(response.getBody());
            String jsonContenidoString = rootNode.path("choices").get(0).path("message").path("content").asText();

            // Mapear el JSON interno que devolvió la IA a un mapa de Java
            return objectMapper.readValue(jsonContenidoString, Map.class);
        } catch (Exception e) {
            System.err.println("💥 [GroqService Error]: " + e.getMessage());
            throw new Exception("La IA de Groq no pudo procesar o interpretar el voucher enviado.");
        }
    }
}