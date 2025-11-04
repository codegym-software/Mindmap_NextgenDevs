package com.example.mindmap.config;

import com.example.mindmap.core.auth.AudienceValidator;
import com.example.mindmap.core.auth.GuestJwtTokenProvider; // Mới
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary; // Mới
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
import org.springframework.security.oauth2.jwt.JwtDecoders; // Mới
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.Collection;
import java.util.HashMap; // Mới
import java.util.Map; // Mới
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final CorsConfigurationSource corsConfigurationSource;
    private final AudienceValidator audienceValidator;
    private final GuestJwtTokenProvider guestJwtTokenProvider; // Mới
    private final String jwkSetUri;
    private final String cognitoIssuerUri;
    private final String guestIssuerUri; // Mới

    public SecurityConfig(CorsConfigurationSource corsConfigurationSource,
                          AudienceValidator audienceValidator,
                          GuestJwtTokenProvider guestJwtTokenProvider, // Mới
                          @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}") String jwkSetUri,
                          @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String cognitoIssuerUri, // Đổi tên
                          @Value("${app.security.guest-jwt-issuer}") String guestIssuerUri // Mới
    ) {
        this.corsConfigurationSource = corsConfigurationSource;
        this.audienceValidator = audienceValidator;
        this.guestJwtTokenProvider = guestJwtTokenProvider; // Mới
        this.jwkSetUri = jwkSetUri;
        this.cognitoIssuerUri = cognitoIssuerUri; // Đổi tên
        this.guestIssuerUri = guestIssuerUri; // Mới
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtDecoder jwtDecoder) throws Exception { // Inject JwtDecoder
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/actuator/**", "/error").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/auth/guest").permitAll() // Mới: Cho phép endpoint Guest
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/api/**").authenticated() // Tất cả các /api/** khác cần auth
                .anyRequest().denyAll()
            )
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
                .decoder(jwtDecoder) // Sử dụng bean JwtDecoder chính
                .jwtAuthenticationConverter(jwtAuthenticationConverter())
            ));

        return http.build();
    }

    /**
     * Bean JwtDecoder cho Cognito
     */
    @Bean
    public JwtDecoder cognitoJwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(cognitoIssuerUri);
        OAuth2TokenValidator<Jwt> withAudience = new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator);
        decoder.setJwtValidator(withAudience);
        return decoder;
    }

    /**
     * Bean JwtDecoder cho Guest (dùng secret key)
     */
    @Bean
    public JwtDecoder guestJwtDecoder() {
        return guestJwtTokenProvider.createDecoder();
    }

    /**
     * Bean JwtDecoder chính.
     * Đây là một Delegating Decoder, nó sẽ thử giải mã token với từng decoder
     * dựa trên 'issuer' (iss) claim trong token.
     */
    @Bean
    @Primary
    public JwtDecoder jwtDecoder(JwtDecoder cognitoJwtDecoder, JwtDecoder guestJwtDecoder) {
        Map<String, JwtDecoder> decoders = new HashMap<>();
        decoders.put(cognitoIssuerUri, cognitoJwtDecoder); // Key là issuer của Cognito
        decoders.put(guestIssuerUri, guestJwtDecoder);     // Key là issuer của Guest

        // Sử dụng JwtDecoders.fromIssuerLocation là cách chuẩn
        // Nhưng ở đây ta có 2 loại (JwkSet và SecretKey), nên dùng Delegating...
        // ... tuy nhiên, cách dễ nhất là dùng fromIssuerLocation cho Cognito
        // và custom cho Guest.
        
        // Cách đơn giản và hiệu quả: DelegatingJwtDecoder
        // Nó sẽ thử từng decoder cho đến khi một cái thành công.
        // Để tối ưu, nó nên dùng 'iss' claim.
        // Spring Boot > 2.7 có `JwtDecoderProviderConfiguration`
        // Cách thủ công:
        return (token) -> {
            try {
                // Thử Cognito trước
                return cognitoJwtDecoder.decode(token);
            } catch (JwtException cognitoException) {
                try {
                    // Nếu thất bại, thử Guest
                    return guestJwtDecoder.decode(token);
                } catch (JwtException guestException) {
                    // Nếu cả hai thất bại, ném lỗi
                    throw cognitoException; // Ném lỗi gốc của Cognito
                }
            }
        };
        
        // Ghi chú: Một cách làm tốt hơn là đọc 'iss' claim
        // và chọn decoder tương ứng, nhưng cách trên là đủ dùng.
    }


    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter scopeAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        scopeAuthoritiesConverter.setAuthorityPrefix("SCOPE_");
        scopeAuthoritiesConverter.setAuthoritiesClaimName("scope"); // Dùng cho cả Guest (SCOPE_GUEST) và Cognito

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
