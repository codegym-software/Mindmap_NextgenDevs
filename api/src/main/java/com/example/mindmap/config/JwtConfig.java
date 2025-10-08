package com.example.mindmap.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;

@Configuration
public class JwtConfig {

    @Value("${APP_SECURITY_JWK_SET_URI:https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_t30OWWizg/.well-known/jwks.json}")
    private String jwkSetUri;

    @Value("${app.security.issuer}")
    private String issuer;

    private final AudienceValidator audienceValidator;

    public JwtConfig(AudienceValidator audienceValidator) {
        this.audienceValidator = audienceValidator;
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> withBoth = new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator);
        decoder.setJwtValidator(withBoth);
        return decoder;
    }
}
