package com.example.mindmap.core.exception;

import java.net.URI;
import java.time.Instant;
import java.util.stream.Collectors;

import org.slf4j.Logger; // Use ProblemDetail for RFC 7807 compliance
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(InvalidBearerTokenException.class)
    public ProblemDetail handleInvalidToken(InvalidBearerTokenException ex) {
        log.warn("Invalid bearer token detected: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problemDetail.setTitle("Invalid Token");
        problemDetail.setType(URI.create("/errors/invalid-token"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    // Handle our custom AccessDeniedException
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problemDetail.setTitle("Access Denied");
        problemDetail.setType(URI.create("/errors/access-denied"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

     // Handle Spring Security's AccessDeniedException (might occur from @PreAuthorize)
     @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
     public ProblemDetail handleSpringAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
         log.warn("Access denied (Spring Security): {}", ex.getMessage());
         ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "You do not have permission to perform this action.");
         problemDetail.setTitle("Access Denied");
         problemDetail.setType(URI.create("/errors/access-denied"));
         problemDetail.setProperty("timestamp", Instant.now());
         return problemDetail;
     }


    // Handle our custom ResourceNotFoundException
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(ResourceNotFoundException ex) {
        log.info("Resource not found: {}", ex.getMessage()); // Info level might be sufficient
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problemDetail.setTitle("Resource Not Found");
        problemDetail.setType(URI.create("/errors/resource-not-found"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationError(MethodArgumentNotValidException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        var errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        error -> error.getDefaultMessage() != null ? error.getDefaultMessage() : "Invalid input"
                ));
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Invalid request parameters");
        problemDetail.setTitle("Validation Error");
        problemDetail.setType(URI.create("/errors/validation-error"));
        problemDetail.setProperty("details", errors);
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    // Catch-all for other unexpected exceptions
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGenericException(Exception ex) {
        log.error("An unexpected error occurred: {}", ex.getMessage(), ex); // Log stack trace for generic errors
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected internal error occurred.");
        problemDetail.setTitle("Internal Server Error");
        problemDetail.setType(URI.create("/errors/internal-server-error"));
        problemDetail.setProperty("timestamp", Instant.now());
        // Avoid leaking exception details in production
        // problemDetail.setProperty("exception", ex.getClass().getName());
        return problemDetail;
    }
}