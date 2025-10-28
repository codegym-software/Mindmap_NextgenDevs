package com.example.mindmap.core.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class AccessDeniedException extends RuntimeException {
    public AccessDeniedException(String message) {
        super(message);
    }
    public AccessDeniedException(String resourceName, String action) {
         super(String.format("User does not have permission to %s this %s", action, resourceName));
     }
}