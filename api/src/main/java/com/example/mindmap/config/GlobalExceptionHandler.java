package com.example.mindmap.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidBearerTokenException.class)
    public ResponseEntity<Map<String, String>> handleInvalidToken(InvalidBearerTokenException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                        "error", "invalid_token",
                        "message", ex.getMessage(),
                        "timestamp", Instant.now().toString()
                ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "error", "access_denied",
                        "message", ex.getMessage(),
                        "timestamp", Instant.now().toString()
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationError(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid input",
                        (existing, replacement) -> existing // Merge duplicate keys
                ));
        return ResponseEntity.badRequest()
                .body(Map.of(
                        "error", "validation_error",
                        "message", "Invalid request parameters",
                        "details", errors,
                        "timestamp", Instant.now().toString()
                ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode())
                .body(Map.of(
                        "error", ex.getReason() != null ? ex.getReason() : "error",
                        "message", ex.getMessage(),
                        "timestamp", Instant.now().toString()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                        "error", "server_error",
                        "message", "An unexpected error occurred",
                        "timestamp", Instant.now().toString()
                ));
    }
}