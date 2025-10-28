package com.example.mindmap.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import com.fasterxml.jackson.databind.SerializationFeature; // Thêm import
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilder jackson2ObjectMapperBuilder() {
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();
        // Đảm bảo các kiểu Instant, ZonedDateTime... được serialize đúng
        builder.modules(new JavaTimeModule());

        // SỬA LỖI (Vấn đề #4):
        // Tắt tính năng ghi ngày tháng (Instants) dưới dạng timestamp số.
        // Điều này buộc Jackson phải sử dụng định dạng chuỗi ISO-8601 (ví dụ: "2025-10-24T10:00:00Z")
        // mà FE có thể dễ dàng parse thành đối tượng Date.
        builder.featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return builder;
    }
}
