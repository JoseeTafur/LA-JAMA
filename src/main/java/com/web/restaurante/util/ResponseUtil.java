package com.web.restaurante.util;

import com.web.restaurante.dto.ApiResponseDTO;
import org.springframework.http.ResponseEntity;

public final class ResponseUtil {

    public static <T> ResponseEntity<ApiResponseDTO<T>> ok(String msg, T data) {
        return ResponseEntity.ok(new ApiResponseDTO<>(true, msg, data));
    }

    public static <T> ResponseEntity<ApiResponseDTO<T>> ok(String msg) {
        return ResponseEntity.ok(new ApiResponseDTO<>(true, msg, null));
    }

    public static <T> ResponseEntity<ApiResponseDTO<T>> okData(T data) {
        return ResponseEntity.ok(new ApiResponseDTO<>(true, "Acción exitosa", data));
    }

}
