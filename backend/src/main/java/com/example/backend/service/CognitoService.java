package com.example.backend.service;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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

    private final String clientId;
    private final String clientSecret;
    private final String region;
    private final String cognitoUrl;

    private final RestTemplate restTemplate;

    public CognitoService(
            @Value("${aws.cognito.clientId}") String clientId,
            @Value("${aws.cognito.clientSecret}") String clientSecret,
            @Value("${aws.region}") String region) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.region = region;
        this.cognitoUrl = "https://cognito-idp." + region + ".amazonaws.com/";
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
            String username = UUID.randomUUID().toString();
            logger.info("Signing up with username: {}, email: {}", username, email);
            String secretHash = CognitoUtil.calculateSecretHash(username, clientId, clientSecret);

            Map<String, Object> userAttr = Map.of("Name", "email", "Value", email);
            List<Map<String, Object>> attrs = Collections.singletonList(userAttr);

            Map<String, Object> body = new HashMap<>();
            body.put("ClientId", clientId);
            body.put("Username", username);
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
            responseBody.put("username", username);
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

    public boolean userExistsByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            logger.error("Email cannot be empty for user existence check");
            throw new IllegalArgumentException("Email cannot be empty");
        }
        try {
            logger.info("Checking if email exists: {}", email);
            String secretHash = CognitoUtil.calculateSecretHash(email, clientId, clientSecret);

            Map<String, Object> body = new HashMap<>();
            body.put("AuthParameters", Map.of(
                    "USERNAME", email,
                    "PASSWORD", "dummy-password",
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

            logger.info("Email exists (successful InitiateAuth response): {}", email);
            return true; // Thành công → email tồn tại
        } catch (HttpClientErrorException e) {
            String responseBody = e.getResponseBodyAsString();
            logger.debug("HTTP Status: {}, Response Body: {}", e.getStatusCode(), responseBody);
            if (responseBody.contains("UserNotFoundException")) {
                logger.info("Email does not exist: {}", email);
                return false;
            } else if (responseBody.contains("NotAuthorizedException")) {
                if (responseBody.contains("Incorrect username or password")) {
                    logger.info("Email exists (NotAuthorizedException): {}", email);
                    return true; // Email tồn tại, mật khẩu sai
                }
                logger.error("Unexpected NotAuthorizedException for {}: {}", email, responseBody);
                throw new RuntimeException("Error checking email: " + responseBody, e);
            } else if (responseBody.contains("PasswordResetRequiredException")) {
                logger.info("Email exists (PasswordResetRequired): {}", email);
                return true;
            } else {
                logger.error("Unexpected error checking email existence for {}: {}", email, responseBody);
                throw new RuntimeException("Error checking email: " + responseBody, e);
            }
        } catch (Exception e) {
            logger.error("Unexpected error checking email existence for {}: {}", email, e.getMessage());
            throw new RuntimeException("Unexpected error: " + e.getMessage(), e);
        }
    }
}