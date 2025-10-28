package com.example.mindmap.core.auth;

import java.util.Optional;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

@Component // Make it a bean for easy injection
public class AuthUtils {

    public Optional<String> getCurrentUserId() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(JwtAuthenticationToken.class::cast)
                .map(JwtAuthenticationToken::getToken)
                .map(Jwt::getSubject); // Assuming 'sub' claim holds the user ID
    }

     public String getRequiredCurrentUserId() {
         return getCurrentUserId()
                 .orElseThrow(() -> new IllegalStateException("Authentication required but not found in SecurityContext"));
     }

    // Add methods to get email, name if needed directly from token
    public Optional<String> getCurrentUserEmail() {
         return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(JwtAuthenticationToken.class::cast)
                .map(JwtAuthenticationToken::getToken)
                .map(jwt -> jwt.getClaimAsString("email"));
    }

    // You can also return the whole Jwt object if needed
    public Optional<Jwt> getCurrentJwt() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(JwtAuthenticationToken.class::cast)
                .map(JwtAuthenticationToken::getToken);
    }
}