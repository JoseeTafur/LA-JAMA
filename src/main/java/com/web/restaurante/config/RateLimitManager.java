package com.web.restaurante.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Component;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitManager {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket crearBucketUsuario() {
        Refill recarga = Refill.intervally(100, Duration.ofMinutes(1));
        return Bucket.builder()
                .addLimit(Bandwidth.classic(100, recarga))
                .build();
    }

    private Bucket crearBucketIPAnonima() {
        Refill recarga = Refill.intervally(15, Duration.ofMinutes(1));
        return Bucket.builder()
                .addLimit(Bandwidth.classic(15, recarga))
                .build();
    }

    public Bucket obtenerBucket(String clave, boolean esAutenticado) {
        if (esAutenticado) {
            return buckets.computeIfAbsent(clave, k -> crearBucketUsuario());
        } else {
            return buckets.computeIfAbsent(clave, k -> crearBucketIPAnonima());
        }
    }
}