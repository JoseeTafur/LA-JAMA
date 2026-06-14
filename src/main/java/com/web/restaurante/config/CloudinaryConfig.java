package com.web.restaurante.config;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    // 🚀 Inyectamos la propiedad unificada que pusiste en el application.properties
    @Value("${app.cloudinary.url}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinaryClient() {
        // Blindaje contra nulos o strings vacíos locales
        if (cloudinaryUrl == null || cloudinaryUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("[La Jama - Error] La propiedad CLOUDINARY_URL no está definida.");
        }

        // Inicializamos pasándole explícitamente la cadena de conexión
        return new Cloudinary(cloudinaryUrl);
    }
}