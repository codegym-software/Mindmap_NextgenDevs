package com.example.mindmap.core.exception;

import java.net.URI;
import java.time.Instant;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import software.amazon.awssdk.services.cognitoidentityprovider.model.CognitoIdentityProviderException; // Mới

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // --- Mới: Xử lý lỗi Cognito ---
    @ExceptionHandler(CognitoIdentityProviderException.class)
    public ProblemDetail handleCognitoException(CognitoIdentityProviderException ex) {
        log.warn("Cognito Error: {}", ex.awsErrorDetails().errorMessage());
        
        HttpStatus status = HttpStatus.BAD_REQUEST; // Mặc định là 400
        String title = "Cognito Error";

        // Phân loại lỗi thường gặp
        if (ex.isThrottlingException()) {
            status = HttpStatus.TOO_MANY_REQUESTS;
            title = "Rate Limit Exceeded";
        } else if ("InvalidPasswordException".equals(ex.awsErrorDetails().errorCode())) {
            status = HttpStatus.BAD_REQUEST;
            title = "Invalid Password";
        } else if ("NotAuthorizedException".equals(ex.awsErrorDetails().errorCode())) {
            status = HttpStatus.UNAUTHORIZED; // Mật khẩu cũ sai cũng ném lỗi này
            title = "Not Authorized";
        } else if ("UserNotFoundException".equals(ex.awsErrorDetails().errorCode())) {
            status = HttpStatus.NOT_FOUND;
            title = "User Not Found";
        }

        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(status, ex.awsErrorDetails().errorMessage());
        problemDetail.setTitle(title);
        problemDetail.setType(URI.create("/errors/cognito-error"));
        problemDetail.setProperty("timestamp", Instant.now());
        problemDetail.setProperty("cognitoErrorCode", ex.awsErrorDetails().errorCode());
        return problemDetail;
    }

    @ExceptionHandler(InvalidBearerTokenException.class)
    public ProblemDetail handleInvalidToken(InvalidBearerTokenException ex) {
        log.warn("Invalid bearer token detected: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problemDetail.setTitle("Invalid Token");
        problemDetail.setType(URI.create("/errors/invalid-token"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problemDetail.setTitle("Access Denied");
        problemDetail.setType(URI.create("/errors/access-denied"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }

     @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
     public ProblemDetail handleSpringAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
         log.warn("Access denied (Spring Security): {}", ex.getMessage());
         ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, "You do not have permission to perform this action.");
         problemDetail.setTitle("Access Denied");
         problemDetail.setType(URI.create("/errors/access-denied"));
         problemDetail.setProperty("timestamp", Instant.now());
         return problemDetail;
     }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(ResourceNotFoundException ex) {
        log.info("Resource not found: {}", ex.getMessage());
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

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGenericException(Exception ex) {
        log.error("An unexpected error occurred: {}", ex.getMessage(), ex);
        ProblemDetail problemDetail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected internal error occurred.");
        problemDetail.setTitle("Internal Server Error");
        problemDetail.setType(URI.create("/errors/internal-server-error"));
        problemDetail.setProperty("timestamp", Instant.now());
        return problemDetail;
    }
}
