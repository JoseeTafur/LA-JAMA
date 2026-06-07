package com.web.restaurante;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableScheduling; // ← agregar este import

@SpringBootApplication
@EnableScheduling // ← agregar esta línea
public class RestauranteApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder application) {
        return application.sources(RestauranteApplication.class);
    }

    public static void main(String[] args) {
        SpringApplication.run(RestauranteApplication.class, args);
    }
}