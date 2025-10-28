package com.example.mindmap.config;

import com.example.mindmap.core.auth.AudienceValidator; // CORRECTED IMPORT
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Collection;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final AudienceValidator audienceValidator;
    private final String jwkSetUri;
    private final String issuerUri;

    public SecurityConfig(CorsConfigurationSource corsConfigurationSource,
                          AudienceValidator audienceValidator,
                          @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri,
                          @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.audienceValidator = audienceValidator;
        this.jwkSetUri = jwkSetUri;
        this.issuerUri = issuerUri;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/actuator/**", "/error").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().denyAll()
            )
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
                .decoder(jwtDecoder())
                .jwtAuthenticationConverter(jwtAuthenticationConverter())
            ));

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuerUri);
        OAuth2TokenValidator<Jwt> withAudience = new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator);
        decoder.setJwtValidator(withAudience);
        return decoder;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopeAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        scopeAuthoritiesConverter.setAuthorityPrefix("SCOPE_");
        scopeAuthoritiesConverter.setAuthoritiesClaimName("scope");

        JwtGrantedAuthoritiesConverter groupAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        groupAuthoritiesConverter.setAuthorityPrefix("ROLE_");
        groupAuthoritiesConverter.setAuthoritiesClaimName("cognito:groups");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> scopeAuthorities = scopeAuthoritiesConverter.convert(jwt);
            Collection<GrantedAuthority> groupAuthorities = groupAuthoritiesConverter.convert(jwt);
            return Stream.concat(scopeAuthorities.stream(), groupAuthorities.stream())
                         .collect(Collectors.toSet());
        });
        return converter;
    }
}
