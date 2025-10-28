package com.example.mindmap.core.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

/**
 * Custom JWT validator to check the 'aud' (audience) or 'client_id' claims.
 * This ensures that the token was issued for this specific application.
 */
@Component
public class AudienceValidator implements OAuth2TokenValidator<Jwt> {

    @Value("${app.security.audience:}") // Optional audience claim
    private String audience;

    @Value("${app.security.frontend-client-id}") // Required client_id from Cognito
    private String frontendClientId;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        // This is for ID tokens which may have an 'aud' claim
        List<String> audClaim = token.getAudience();
        if (audClaim != null && !audClaim.isEmpty() && audience != null && !audience.isBlank()) {
            if (audClaim.contains(audience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "The required audience is missing", null));
        }

        // This is for Access tokens from Cognito which have 'client_id' and 'token_use'
        String tokenUse = token.getClaimAsString("token_use");
        String clientId = token.getClaimAsString("client_id");
        if (Objects.equals(tokenUse, "access") && Objects.equals(clientId, frontendClientId)) {
            return OAuth2TokenValidatorResult.success();
        }

        return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token","Neither a valid 'aud' nor a matching (token_use=access & client_id) was found", null)
        );
    }
}
