package com.web.restaurante.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public String subirImagen(MultipartFile archivo) throws IOException {
        if (archivo.isEmpty()) return null;

        Map<?, ?> opciones = ObjectUtils.asMap(
                "folder", "lajama/productos",
                "use_filename", true,
                "unique_filename", true
        );

        Map<?, ?> resultado = cloudinary.uploader().upload(archivo.getBytes(), opciones);
        return resultado.get("secure_url").toString();
    }

    public String subirImagen(MultipartFile archivo, String carpetaDestino) throws IOException {
        if (archivo.isEmpty()) return null;

        String nombreOriginal = archivo.getOriginalFilename();
        if (nombreOriginal != null && nombreOriginal.contains(".")) {
            nombreOriginal = nombreOriginal.substring(0, nombreOriginal.lastIndexOf("."));
        } else {
            nombreOriginal = "voucher_" + System.currentTimeMillis();
        }

        // 🔥 Configuración estricta para la auditoría de La Jama
        Map<?, ?> opciones = ObjectUtils.asMap(
                "folder", carpetaDestino,
                "public_id", nombreOriginal,
                "use_filename", true,
                "unique_filename", false,
                "overwrite", true
        );

        Map<?, ?> resultado = cloudinary.uploader().upload(archivo.getBytes(), opciones);
        return resultado.get("secure_url").toString();
    }
}