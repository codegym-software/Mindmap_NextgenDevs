// backend/src/main/java/com/example/backend/controller/AuthController.java
package com.example.backend.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.dto.AuthDto;
import com.example.backend.service.CognitoService;
import com.example.backend.repository.UserRepository;
import com.example.backend.model.User;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final CognitoService cognitoService;
    private final UserRepository userRepository;

    public AuthController(CognitoService cognitoService, UserRepository userRepository) {
        this.cognitoService = cognitoService;
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthDto.LoginRequest request) {
        try {
            logger.info("Login request for email: {}", request.email);
            Map<String, Object> result = cognitoService.login(request.email, request.password);
            logger.info("Login successful for email: {}", request.email);
            return ResponseEntity.ok(new AuthDto.AuthenticationResult(result));
        } catch (Exception e) {
            logger.error("Login failed for email: {}. Error: {}", request.email, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthDto.ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/cognito/register")
    public ResponseEntity<?> register(@RequestBody AuthDto.RegisterRequest request) {
        try {
            logger.info("Register request for email: {}", request.email);
            // First check DB to prevent duplicate
            if (userRepository.existsByEmail(request.email)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new AuthDto.ErrorResponse("Email already exists"));
            }
            Map<String, Object> result = cognitoService.signUp(request.email, request.password);
            // Persist user locally (so /checkemail sees it next time)
            String username = (String) result.get("username");
            if (username == null) {
                logger.warn("SignUp result missing username for email {}", request.email);
            } else if (!userRepository.existsByEmail(request.email)) {
                User user = new User();
                user.setEmail(request.email);
                user.setCognitoUsername(username);
                user.setCreatedAt(LocalDateTime.now());
                userRepository.save(user);
            }
            logger.info("Register successful for email: {}", request.email);
            return ResponseEntity.ok(new AuthDto.SignUpResult(result));
        } catch (Exception e) {
            logger.error("Register failed for email: {}. Error: {}", request.email, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthDto.ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/cognito/confirm")
    public ResponseEntity<?> confirm(@RequestBody AuthDto.ConfirmRequest request) {
        try {
            logger.info("Confirm request for username: {}", request.username);
            Map<String, Object> result = cognitoService.confirmSignUp(request.username, request.code);
            logger.info("Confirm successful for username: {}", request.username);
            return ResponseEntity.ok(new AuthDto.SuccessResponse("Confirmation successful"));
        } catch (Exception e) {
            logger.error("Confirm failed for username: {}. Error: {}", request.username, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthDto.ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/cognito/resend")
    public ResponseEntity<?> resend(@RequestBody AuthDto.ResendRequest request) {
        try {
            logger.info("Resend confirmation code request for username: {}", request.username);
            Map<String, Object> result = cognitoService.resendConfirmationCode(request.username);
            logger.info("Resend confirmation code successful for username: {}", request.username);
            return ResponseEntity.ok(new AuthDto.SuccessResponse("Confirmation code resent. Check your email."));
        } catch (Exception e) {
            logger.error("Resend confirmation code failed for username: {}. Error: {}", request.username, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthDto.ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody AuthDto.ForgotPasswordRequest request) {
        try {
            logger.info("Forgot password request for username: {}", request.username);
            Map<String, Object> result = cognitoService.forgotPassword(request.username);
            logger.info("Forgot password code sent for username: {}", request.username);
            return ResponseEntity.ok(new AuthDto.SuccessResponse("Password reset code sent. Check your email."));
        } catch (Exception e) {
            logger.error("Forgot password failed for username: {}. Error: {}", request.username, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthDto.ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/reset")
    public ResponseEntity<?> resetPassword(@RequestBody AuthDto.ResetPasswordRequest request) {
        try {
            logger.info("Reset password request for username: {}", request.username);
            Map<String, Object> result = cognitoService.confirmForgotPassword(request.username, request.code, request.newPassword);
            logger.info("Reset password successful for username: {}", request.username);
            return ResponseEntity.ok(new AuthDto.SuccessResponse("Password reset successful"));
        } catch (Exception e) {
            logger.error("Reset password failed for username: {}. Error: {}", request.username, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthDto.ErrorResponse(e.getMessage()));
        }
    }

    @PostMapping("/checkemail")
    public ResponseEntity<?> checkEmail(@RequestBody AuthDto.CheckEmailRequest request) {
        try {
            logger.info("Check email request (DB) for email: {}", request.email);
            if (request.email == null || request.email.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new AuthDto.ErrorResponse("Email is required"));
            }
            boolean exists = userRepository.existsByEmail(request.email.trim());
            logger.info("Check email result for {} => exists={} (DB)", request.email, exists);
            return ResponseEntity.ok(Map.of("exists", exists));
        } catch (Exception e) {
            logger.error("Check email failed for email: {}. Error: {}", request.email, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new AuthDto.ErrorResponse(e.getMessage()));
        }
    }
}