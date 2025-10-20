package com.example.mindmap.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Rate limit theo IP đơn giản.
 * Lưu ý: nếu bạn có reverse proxy, cân nhắc đọc X-Forwarded-For để lấy client IP thật.
 */
@Component
public class RateLimitFilter implements Filter {

    private final Cache<String, Bucket> cache;
    private final int rpm;

    public RateLimitFilter(@Value("${app.rateLimit.requestsPerMinute:1200}") int rpm) {
        this.cache = Caffeine.newBuilder()
                .expireAfterAccess(10, TimeUnit.MINUTES)
                .maximumSize(10000)
                .build();
        this.rpm = rpm;
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.classic(rpm, Refill.greedy(rpm, Duration.ofMinutes(1)));
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest req = (HttpServletRequest) request;

        // Bỏ qua rate limit cho health/actuator nếu muốn
        String path = req.getRequestURI();
        if (path.startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        String ip = req.getRemoteAddr(); // cân nhắc X-Forwarded-For nếu cần
        Bucket bucket = cache.get(ip, k -> newBucket());

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            HttpServletResponse resp = (HttpServletResponse) response;
            resp.setStatus(429);
            resp.setContentType("application/json");
            resp.getWriter().write("{\"error\":\"rate_limit_exceeded\"}");
        }
    }
}
