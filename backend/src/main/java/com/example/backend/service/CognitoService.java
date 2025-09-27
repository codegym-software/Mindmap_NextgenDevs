// backend/src/main/java/com/example/backend/service/CognitoService.java
package com.example.backend.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import com.example.backend.util.CognitoUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jdk8.Jdk8Module;

@Service
public class CognitoService {

    private static final Logger logger = LoggerFactory.getLogger(CognitoService.class);

    private final String clientId = "53dnt9mp3e5enn7kcsd4mhuksd";
    private final String clientSecret = "1vh4cpm093kvgjppm66kiku731jja093runh3qnrvnvr05bjs98";
    private final String region = "ap-southeast-2";
    private final String cognitoUrl = "https://cognito-idp." + region + ".amazonaws.com/";

    private final RestTemplate restTemplate;

    public CognitoService() {
        this.restTemplate = createRestTemplate();
    }

    private RestTemplate createRestTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new Jdk8Module());
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter();
        converter.setObjectMapper(objectMapper);
        converter.setSupportedMediaTypes(Arrays.asList(
                MediaType.APPLICATION_JSON,
                new MediaType("application", "x-amz-json-1.1")
        ));
        restTemplate.getMessageConverters().add(0, converter);
        return restTemplate;
    }

    public Map<String, Object> login(String username, String password) {
        try {
            logger.info("Logging in with username/email: {}", username);
            String secretHash = CognitoUtil.calculateSecretHash(username, clientId, clientSecret);
            logger.debug("Login SecretHash: {}", secretHash);

            Map<String, Object> body = new HashMap<>();
            body.put("AuthParameters", Map.of(
                    "USERNAME", username,
                    "PASSWORD", password,
                    "SECRET_HASH", secretHash
            ));
            body.put("AuthFlow", "USER_PASSWORD_AUTH");
            body.put("ClientId", clientId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "x-amz-json-1.1"));
            headers.set("X-Amz-Target", "AWSCognitoIdentityProviderService.InitiateAuth");

            ResponseEntity<Map> response = restTemplate.exchange(
                    cognitoUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("Cognito login error: {}", response.getBody());
                throw new RuntimeException("Cognito error: " + response.getBody());
            }

            Map<String, Object> responseBody = response.getBody();
            Map<String, Object> authResult = (Map<String, Object>) responseBody.get("AuthenticationResult");
            if (authResult == null) {
                throw new RuntimeException("AuthenticationResult is null");
            }
            return authResult;
        } catch (HttpClientErrorException e) {
            logger.error("Login failed for username {}: {}", username, e.getResponseBodyAsString());
            throw new RuntimeException("Login failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("Login failed for username {}: {}", username, e.getMessage());
            throw new RuntimeException("Login failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> signUp(String email, String password) {
        try {
            String username = UUID.randomUUID().toString(); // Tạo username ngẫu nhiên
            logger.info("Signing up with username: {}, email: {}", username, email);
            String secretHash = CognitoUtil.calculateSecretHash(username, clientId, clientSecret); // Sử dụng username (UUID) để tính SecretHash

            Map<String, Object> userAttr = Map.of("Name", "email", "Value", email);
            List<Map<String, Object>> attrs = Collections.singletonList(userAttr);

            Map<String, Object> body = new HashMap<>();
            body.put("ClientId", clientId);
            body.put("Username", username); // Dùng UUID làm username
            body.put("Password", password);
            body.put("UserAttributes", attrs);
            body.put("SecretHash", secretHash);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "x-amz-json-1.1"));
            headers.set("X-Amz-Target", "AWSCognitoIdentityProviderService.SignUp");

            ResponseEntity<Map> response = restTemplate.exchange(
                    cognitoUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("Cognito SignUp error: {}", response.getBody());
                throw new RuntimeException("Cognito SignUp error: " + response.getBody());
            }

            Map<String, Object> responseBody = response.getBody();
            responseBody.put("username", username); // Thêm username vào phản hồi
            return responseBody;
        } catch (HttpClientErrorException e) {
            logger.error("SignUp failed for email {}: {}", email, e.getResponseBodyAsString());
            throw new RuntimeException("SignUp failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("SignUp failed for email {}: {}", email, e.getMessage());
            throw new RuntimeException("SignUp failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> confirmSignUp(String username, String confirmationCode) {
        try {
            logger.info("Confirming sign-up for username: {}", username);
            String secretHash = CognitoUtil.calculateSecretHash(username, clientId, clientSecret);
            logger.debug("ConfirmSignUp SecretHash: {}", secretHash);

            Map<String, Object> body = new HashMap<>();
            body.put("ClientId", clientId);
            body.put("Username", username);
            body.put("ConfirmationCode", confirmationCode);
            body.put("SecretHash", secretHash);

            logger.debug("ConfirmSignUp payload: {}", body);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "x-amz-json-1.1"));
            headers.set("X-Amz-Target", "AWSCognitoIdentityProviderService.ConfirmSignUp");

            ResponseEntity<Map> response = restTemplate.exchange(
                    cognitoUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("Cognito ConfirmSignUp error: {}", response.getBody());
                throw new RuntimeException("Cognito ConfirmSignUp error: " + response.getBody());
            }

            logger.info("ConfirmSignUp successful for username: {}", username);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            logger.error("ConfirmSignUp failed for username {}: {}", username, e.getResponseBodyAsString());
            throw new RuntimeException("ConfirmSignUp failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("ConfirmSignUp failed for username {}: {}", username, e.getMessage());
            throw new RuntimeException("ConfirmSignUp failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> resendConfirmationCode(String username) {
        try {
            logger.info("Resending confirmation code for username: {}", username);
            String secretHash = CognitoUtil.calculateSecretHash(username, clientId, clientSecret);
            logger.debug("ResendConfirmationCode SecretHash: {}", secretHash);

            Map<String, Object> body = new HashMap<>();
            body.put("ClientId", clientId);
            body.put("Username", username);
            body.put("SecretHash", secretHash);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "x-amz-json-1.1"));
            headers.set("X-Amz-Target", "AWSCognitoIdentityProviderService.ResendConfirmationCode");

            ResponseEntity<Map> response = restTemplate.exchange(
                    cognitoUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("Cognito ResendConfirmationCode error: {}", response.getBody());
                throw new RuntimeException("Cognito ResendConfirmationCode error: " + response.getBody());
            }

            return response.getBody();
        } catch (HttpClientErrorException e) {
            logger.error("ResendConfirmationCode failed for username {}: {}", username, e.getResponseBodyAsString());
            throw new RuntimeException("ResendConfirmationCode failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("ResendConfirmationCode failed for username {}: {}", username, e.getMessage());
            throw new RuntimeException("ResendConfirmationCode failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> forgotPassword(String username) {
        try {
            logger.info("Initiating forgot password for username: {}", username);
            String secretHash = CognitoUtil.calculateSecretHash(username, clientId, clientSecret);
            logger.debug("ForgotPassword SecretHash: {}", secretHash);

            Map<String, Object> body = new HashMap<>();
            body.put("ClientId", clientId);
            body.put("Username", username);
            body.put("SecretHash", secretHash);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "x-amz-json-1.1"));
            headers.set("X-Amz-Target", "AWSCognitoIdentityProviderService.ForgotPassword");

            ResponseEntity<Map> response = restTemplate.exchange(
                    cognitoUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("Cognito ForgotPassword error: {}", response.getBody());
                throw new RuntimeException("Cognito ForgotPassword error: " + response.getBody());
            }

            return response.getBody();
        } catch (HttpClientErrorException e) {
            logger.error("ForgotPassword failed for username {}: {}", username, e.getResponseBodyAsString());
            throw new RuntimeException("ForgotPassword failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("ForgotPassword failed for username {}: {}", username, e.getMessage());
            throw new RuntimeException("ForgotPassword failed: " + e.getMessage(), e);
        }
    }

    public Map<String, Object> confirmForgotPassword(String username, String confirmationCode, String newPassword) {
        try {
            logger.info("Confirming forgot password for username: {}", username);
            String secretHash = CognitoUtil.calculateSecretHash(username, clientId, clientSecret);
            logger.debug("ConfirmForgotPassword SecretHash: {}", secretHash);

            Map<String, Object> body = new HashMap<>();
            body.put("ClientId", clientId);
            body.put("Username", username);
            body.put("ConfirmationCode", confirmationCode);
            body.put("Password", newPassword);
            body.put("SecretHash", secretHash);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "x-amz-json-1.1"));
            headers.set("X-Amz-Target", "AWSCognitoIdentityProviderService.ConfirmForgotPassword");

            ResponseEntity<Map> response = restTemplate.exchange(
                    cognitoUrl,
                    HttpMethod.POST,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            if (!response.getStatusCode().is2xxSuccessful()) {
                logger.error("Cognito ConfirmForgotPassword error: {}", response.getBody());
                throw new RuntimeException("Cognito ConfirmForgotPassword error: " + response.getBody());
            }

            return response.getBody();
        } catch (HttpClientErrorException e) {
            logger.error("ConfirmForgotPassword failed for username {}: {}", username, e.getResponseBodyAsString());
            throw new RuntimeException("ConfirmForgotPassword failed: " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            logger.error("ConfirmForgotPassword failed for username {}: {}", username, e.getMessage());
            throw new RuntimeException("ConfirmForgotPassword failed: " + e.getMessage(), e);
        }
    }
}