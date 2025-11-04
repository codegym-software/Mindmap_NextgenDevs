// src/main/java/com/example/mindmap/core/auth/GuestJwtTokenProvider.java
package com.example.mindmap.core.auth;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.Date;
import java.util.List;

/**
 * Tạo và xác thực JWT tùy chỉnh (Local) cho Guest user.
 */
@Component
public class GuestJwtTokenProvider {

    private final String jwtSecret;
    private final String jwtIssuer;
    private final long jwtExpirationMs;
    private final SecretKey secretKey;
    private final JWSSigner signer;


    public GuestJwtTokenProvider(
            @Value("${app.security.guest-jwt-secret}") String jwtSecret,
            @Value("${app.security.guest-jwt-issuer}") String jwtIssuer,
            @Value("${app.security.guest-jwt-expiration-ms:86400000}") long jwtExpirationMs) throws Exception {
        
        if (jwtSecret.length() < 32) {
             throw new IllegalArgumentException("Guest JWT secret must be at least 32 bytes long for HS256");
        }
        this.jwtSecret = jwtSecret;
        this.jwtIssuer = jwtIssuer;
        this.jwtExpirationMs = jwtExpirationMs;
        
        // Cấu hình để ký
        this.secretKey = new SecretKeySpec(jwtSecret.getBytes(), JWSAlgorithm.HS256.getName());
        this.signer = new MACSigner(this.secretKey);
    }

    /**
     * Tạo một Guest JWT mới cho một userId
     */
    public String createToken(String userId) {
        Instant now = Instant.now();
        Instant expiry = now.plusMillis(jwtExpirationMs);

        try {
            JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                    .issuer(jwtIssuer)
                    .subject(userId)
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(expiry))
                    .claim("scope", "GUEST") // Thêm scope GUEST
                    .build();

            SignedJWT signedJWT = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.HS256).build(),
                    claimsSet
            );

            signedJWT.sign(signer);
            return signedJWT.serialize();
            
        } catch (Exception e) {
            throw new RuntimeException("Error creating guest JWT", e);
        }
    }

    /**
     * Tạo một JwtDecoder (trình giải mã) mà Spring Security có thể sử dụng
     * để xác thực Guest JWT.
     */
    public JwtDecoder createDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(this.secretKey).build();

        // Thêm trình xác thực (validator) để kiểm tra issuer
        OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(jwtIssuer);
        decoder.setJwtValidator(withIssuer);

        return decoder;
    }
}
