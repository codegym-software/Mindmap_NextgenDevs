// src/main/java/com/example/mindmap/config/CognitoConfig.java
package com.example.mindmap.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;

@Configuration
public class CognitoConfig {

    @Value("${app.aws.region}") // Bạn cần thêm property này vào application.yml
    private String awsRegion;

    /**
     * Cung cấp Cognito Client Bean để tương tác với AWS Cognito.
     * Nó sẽ tự động tìm credentials (ví dụ: từ instance profile, env variables).
     */
    @Bean
    public CognitoIdentityProviderClient cognitoIdentityProviderClient() {
        return CognitoIdentityProviderClient.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(DefaultCredentialsProvider.create())
                .build();
    }
}
