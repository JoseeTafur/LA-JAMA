package com.web.restaurante.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class GlobalModelAttributes {

    @Value("${app.images.base-url}")
    private String imageBaseUrl;

    @ModelAttribute
    public void addGlobalAttributes(Model model) {
        model.addAttribute("imageBaseUrl", imageBaseUrl);
    }
}
