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

        builder.modules(new JavaTimeModule());

        // Date → ISO-8601
        builder.featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        builder.serializerByType(Enum.class, new com.fasterxml.jackson.databind.ser.std.ToStringSerializer());
        builder.featuresToEnable(SerializationFeature.WRITE_ENUMS_USING_TO_STRING);


        return builder;
    }
}
