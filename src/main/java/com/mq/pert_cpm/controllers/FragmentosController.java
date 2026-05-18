package com.mq.pert_cpm.controllers;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Sirve los fragmentos HTML parciales que se inyectan dinámicamente
 * en el contenedor #main-content de index.html mediante AJAX.
 *
 * Cada fragmento vive en: templates/fragmentos/{nombre}.html
 * y NO contiene sidebar, navbar ni <head> — solo el contenido de página.
 */
@Controller
public class FragmentosController {

    /**
     * Devuelve el fragmento correspondiente al nombre recibido en la URL.
     * Ejemplo: GET /fragmentos/dashboard  →  templates/fragmentos/dashboard.html
     *          GET /fragmentos/pert-cpm   →  templates/fragmentos/pert-cpm.html
     */
    @GetMapping("/fragmentos/{nombre}")
    public String fragmento(@PathVariable String nombre) {
        return "fragmentos/" + nombre;
    }
}
