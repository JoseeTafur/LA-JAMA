package com.web.restaurante.config;

import com.cloudinary.Cloudinary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    @Value("${app.cloudinary.url}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinaryClient() {
        if (cloudinaryUrl == null || cloudinaryUrl.trim().isEmpty()) {
            throw new IllegalArgumentException("[La Jama - Error] La propiedad CLOUDINARY_URL no está definida.");
        }

        return new Cloudinary(cloudinaryUrl);
    }
}