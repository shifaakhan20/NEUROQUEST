package com.example;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public final class CorsUtil {

    private static final String ALLOWED_ORIGIN = "http://localhost:5173";

    private CorsUtil() {}

    public static boolean configure(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");

        if (ALLOWED_ORIGIN.equals(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            response.setHeader("Access-Control-Max-Age", "3600");
            response.setHeader("Vary", "Origin");
        }

        // Handle CORS OPTIONS preflight
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return true;
        }

        return false;
    }
}