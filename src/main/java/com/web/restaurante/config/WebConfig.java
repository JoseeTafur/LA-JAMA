package com.web.restaurante.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@RequiredArgsConstructor
@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final SessionInterceptor sessionInterceptor;

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/css/**").addResourceLocations("classpath:/static/css/").setCachePeriod(0);
        registry.addResourceHandler("/js/**").addResourceLocations("classpath:/static/js/").setCachePeriod(0);
        registry.addResourceHandler("/imagenes/**").addResourceLocations("file:/C:/restaurante/imagenes/");
        registry.addResourceHandler("/favicon.png").addResourceLocations("classpath:/static/").setCachePeriod(0);
        registry.addResourceHandler("/img/**").addResourceLocations("classpath:/static/img/").setCachePeriod(0);

        // 🌟 SOLUCIÓN 1: Registrar la carpeta de videos estáticos
        registry.addResourceHandler("/video/**")
                .addResourceLocations("classpath:/static/video/")
                .setCachePeriod(0);
    }

    @Override
    public void addInterceptors(@NonNull InterceptorRegistry registry) {
        registry.addInterceptor(sessionInterceptor)
                .addPathPatterns("/**")
                .excludePathPatterns(
                        "/carta/**",
                        "/admin/pagos-digitales/api/guardar",
                        "/admin/pagos-digitales/api/actualizar-imagen/**",
                        "/css/**",
                        "/js/**",
                        "/img/**",
                        "/imagenes/**",
                        "/error",
                        "/favicon.png",
                        "/video/**",
                        "/static/**",
                        "/resources/**",
                        "/webjars/**"
                );
    }

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:8080", "http://localhost:3000")
                .allowedMethods("GET", "PATCH", "POST", "PUT", "DELETE", "OPTIONS")
                .allowCredentials(true);
    }
}