package com.example.mindmap.core.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND) // Automatically sets response status
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s not found with %s : '%s'", resourceName, fieldName, fieldValue));
    }

    public ResourceNotFoundException(String message) {
        super(message);
    }
}