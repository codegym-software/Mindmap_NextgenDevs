package com.example.mindmap.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.*;

import java.util.List;

@Configuration
public class CorsConfig {

    @Value("#{'${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000}'.split(',')}")
    private List<String> allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(allowedOrigins);
        cfg.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS"));
        cfg.setAllowedHeaders(List.of("Authorization","Content-Type","Accept","Origin","X-Requested-With"));
        cfg.setExposedHeaders(List.of("WWW-Authenticate","Authorization"));
        cfg.setAllowCredentials(false); // Bearer header, no cookie
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}