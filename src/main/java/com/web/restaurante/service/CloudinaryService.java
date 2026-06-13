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

        // Organizamos las imágenes del menú dentro de una carpeta dedicada en la nube
        Map<?, ?> opciones = ObjectUtils.asMap(
                "folder", "lajama/productos",
                "use_filename", true,
                "unique_filename", true
        );

        // Subida directa de los bytes del flujo multipart
        Map<?, ?> resultado = cloudinary.uploader().upload(archivo.getBytes(), opciones);

        // Retornamos la URL segura HTTPS que genera Cloudinary
        return resultado.get("secure_url").toString();
    }
}