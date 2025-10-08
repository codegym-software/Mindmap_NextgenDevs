package com.example.mindmap.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import org.springframework.security.web.SecurityFilterChain;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Resource server (stateless):
 *  - TẮT CSRF cho API (SPA dùng Bearer token)
 *  - Bật CORS theo cấu hình CorsConfig
 *  - Bật JWT resource server (JwtConfig)
 *  - Map "cognito:groups" -> ROLE_*
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationConverter jwtAuthConverter) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/actuator/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter)))
            .headers(h -> h.contentSecurityPolicy(csp -> csp
                .policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"))
            );
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopes = new JwtGrantedAuthoritiesConverter();
        scopes.setAuthorityPrefix("SCOPE_");
        scopes.setAuthoritiesClaimName("scope");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> scopeAuth = scopes.convert(jwt);
            List<String> groups = jwt.getClaimAsStringList("cognito:groups");
            Collection<GrantedAuthority> groupAuth = (groups == null ? List.<String>of() : groups)
                    .stream()
                    .map(g -> new SimpleGrantedAuthority("ROLE_" + g))
                    .collect(Collectors.toList());
            return new java.util.ArrayList<GrantedAuthority>() {{
                addAll(scopeAuth);
                addAll(groupAuth);
            }};
        });
        return converter;
    }
}
