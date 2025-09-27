//package com.example.backend.util;
//
//import io.jsonwebtoken.Jwts;
//import io.jsonwebtoken.SignatureAlgorithm;
//import org.springframework.beans.factory.annotation.Value;
//import org.springframework.stereotype.Component;
//
//import javax.annotation.PostConstruct;
//import java.security.Key;
//import javax.crypto.spec.SecretKeySpec;
//import java.util.Date;
//import java.util.Base64;
//
//@Component
//public class JwtUtil {
//    @Value("${jwt.secret}")
//    private String secret;
//
//    @Value("${jwt.expiration-ms}")
//    private long expirationMs;
//
//    private Key key;
//
//    @PostConstruct
//    public void init() {
//        byte[] decodedKey = Base64.getEncoder().encode(secret.getBytes());
//        key = new SecretKeySpec(decodedKey, 0, decodedKey.length, "HmacSHA256");
//    }
//
//    public String generateToken(String subject) {
//        long now = System.currentTimeMillis();
//        return Jwts.builder()
//                .setSubject(subject)
//                .setIssuedAt(new Date(now))
//                .setExpiration(new Date(now + expirationMs))
//                .signWith(SignatureAlgorithm.HS256, key)
//                .compact();
//    }
//
//    public String getSubjectFromToken(String token) {
//        try {
//            return Jwts.parser()
//                    .setSigningKey(key)
//                    .parseClaimsJws(token)
//                    .getBody()
//                    .getSubject();
//        } catch (Exception e) {
//            return null;
//        }
//    }
//}