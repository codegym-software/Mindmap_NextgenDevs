package com.example.mindmap.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Objects;

/**
 * Cognito:
 *  - Nếu token có 'aud' & cấu hình 'app.security.audience' != "" -> kiểm 'aud' chứa audience (ID token).
 *  - Nếu KHÔNG có 'aud' (thường ACCESS token Cognito) -> chấp nhận khi (token_use=access) & (client_id == app.security.frontend-client-id).
 */
@Component
public class AudienceValidator implements OAuth2TokenValidator<Jwt> {

    @Value("${app.security.audience:}")
    private String audience;

    @Value("${app.security.frontend-client-id}")
    private String frontendClientId;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        List<String> audClaim = token.getAudience();
        if (audClaim != null && !audClaim.isEmpty() && audience != null && !audience.isBlank()) {
            if (audClaim.contains(audience)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "The required audience is missing", null));
        }

        String tokenUse = token.getClaimAsString("token_use");  // "access" | "id"
        String clientId = token.getClaimAsString("client_id");
        if (Objects.equals(tokenUse, "access") && Objects.equals(clientId, frontendClientId)) {
            return OAuth2TokenValidatorResult.success();
        }

        return OAuth2TokenValidatorResult.failure(
            new OAuth2Error("invalid_token","Neither a valid 'aud' nor (token_use=access & client_id) matched", null)
        );
    }
}
