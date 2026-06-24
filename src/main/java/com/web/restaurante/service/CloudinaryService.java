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

    /**
     * 🍔 Método 1: Para las imágenes del menú (Productos)
     * Mantiene tu lógica intacta para no romper el módulo de catálogo.
     */
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

    /**
     * 📱 Método 2: Para los Vouchers de Pago Digital (Yape / Plin)
     * Fuerza la subida a 'vouchers-lajama' respetando el nombre exacto sin sufijos.
     */
    public String subirImagen(MultipartFile archivo, String carpetaDestino) throws IOException {
        if (archivo.isEmpty()) return null;

        // Extraemos el nombre original del voucher sin la extensión (.png/.jpg)
        String nombreOriginal = archivo.getOriginalFilename();
        if (nombreOriginal != null && nombreOriginal.contains(".")) {
            nombreOriginal = nombreOriginal.substring(0, nombreOriginal.lastIndexOf("."));
        } else {
            nombreOriginal = "voucher_" + System.currentTimeMillis();
        }

        // 🔥 Configuración estricta para la auditoría de La Jama
        Map<?, ?> opciones = ObjectUtils.asMap(
                "folder", carpetaDestino,          // 📁 Pasarás "vouchers-lajama"
                "public_id", nombreOriginal,       // 🎯 Nombre exacto (ej: 0.50)
                "use_filename", true,              // 📝 Usa el nombre provisto
                "unique_filename", false,          // ⛔ Desactiva el sufijo aleatorio como _vd3lua
                "overwrite", true                  // 🔄 Si se vuelve a subir, lo reemplaza cleanly
        );

        Map<?, ?> resultado = cloudinary.uploader().upload(archivo.getBytes(), opciones);
        return resultado.get("secure_url").toString();
    }
}