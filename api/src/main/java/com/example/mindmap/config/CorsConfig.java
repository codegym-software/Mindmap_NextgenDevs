package com.example.mindmap.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    // Allow multiple origins from config, split by comma
    @Value("#{'${app.cors.allowed-origins:https://app.nhom7nextgen.cloud}'.split(',')}")
    private List<String> allowedOrigins;

    @Value("${app.cors.allowed-methods:GET,POST,PUT,DELETE,OPTIONS,PATCH}") // Allow PATCH too
    private List<String> allowedMethods;

    @Value("${app.cors.allowed-headers:Authorization,Content-Type,Accept,Origin,X-Requested-With}")
    private List<String> allowedHeaders;

    @Value("${app.cors.exposed-headers:WWW-Authenticate,Authorization}") // As before
    private List<String> exposedHeaders;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(allowedMethods);
        config.setAllowedHeaders(allowedHeaders);
        config.setExposedHeaders(exposedHeaders);
        config.setAllowCredentials(false); // Still false for Bearer tokens
        config.setMaxAge(3600L); // Cache preflight response for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config); // Apply CORS only to /api/** paths
        source.registerCorsConfiguration("/ws/**", config); // Apply CORS to WebSocket path if needed
        return source;
    }
}