package com.web.restaurante.dto;

public record ApiResponseDTO<T>(
        boolean success,
        String message,
        T data
) {
}
