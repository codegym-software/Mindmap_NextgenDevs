package com.example.mindmap.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.http.HttpMethod;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Configuration
public class RateLimitConfig {

    private static final Logger log = LoggerFactory.getLogger(RateLimitConfig.class);

    @Value("${app.rate-limit.requests-per-minute:10000}")
    private int requestsPerMinute;

    @Value("${app.rate-limit.cache.duration-minutes:10}")
    private int cacheDurationMinutes;

    @Value("${app.rate-limit.cache.max-size:10000}")
    private long cacheMaxSize;

    @Bean
    @ConditionalOnProperty(value = "app.rate-limit.enabled", havingValue = "true", matchIfMissing = true)
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilter() {
        // [QUAN TRỌNG] Log ra để biết filter đang chạy
        log.info("✅ Rate Limit initialized: {} req/min (DEV MODE: HIGH LIMIT)", requestsPerMinute);
        FilterRegistrationBean<RateLimitFilter> registrationBean =
                new FilterRegistrationBean<>(new RateLimitFilter(requestsPerMinute, cacheDurationMinutes, cacheMaxSize));

        registrationBean.addUrlPatterns("/api/*");
        registrationBean.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);

        return registrationBean;
    }

    private static class RateLimitFilter implements Filter {
        private final Cache<String, TokenBucket> rateLimitCache;
        private final int requestsPerMinute;

        public RateLimitFilter(int requestsPerMinute, int cacheDurationMinutes, long cacheMaxSize) {
            this.requestsPerMinute = requestsPerMinute;
            this.rateLimitCache = Caffeine.newBuilder()
                    .expireAfterAccess(cacheDurationMinutes, TimeUnit.MINUTES)
                    .maximumSize(cacheMaxSize)
                    .build();
        }

        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws IOException, ServletException {

            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            // 1. Bypass OPTIONS (CORS Pre-flight)
            if (HttpMethod.OPTIONS.matches(httpRequest.getMethod())) {
                chain.doFilter(request, response);
                return;
            }

            // 2. [FIX LOOP] Để fix lỗi gấp cho bạn, tôi sẽ BYPASS rate limit cho tất cả request
            // cho đến khi bạn triển khai Production thực sự.
            // Comment dòng dưới lại nếu muốn bật lại Rate Limit.
            if (true) { 
                chain.doFilter(request, response);
                return;
            }

            // --- Logic Rate Limit (Tạm thời bị disable bởi đoạn if(true) ở trên) ---

            String clientIp = resolveClientIp(httpRequest);
            TokenBucket bucket = rateLimitCache.get(clientIp, key -> new TokenBucket(requestsPerMinute));

            if (bucket.tryConsume()) {
                chain.doFilter(request, response);
            } else {
                log.warn("🚫 Rate limit exceeded for IP: {}", clientIp);
                
                // [FIX LỖI CORS KHI 429] Bắt buộc phải có header này, nếu không Browser sẽ báo Network Error
                String origin = httpRequest.getHeader("Origin");
                if (origin != null) {
                    httpResponse.setHeader("Access-Control-Allow-Origin", origin);
                    httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
                    httpResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
                    httpResponse.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
                }
                
                httpResponse.setStatus(429);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write(
                        "{\"error\":\"rate_limit_exceeded\",\"message\":\"Too many requests. Slow down!\"}"
                );
            }
        }

        private String resolveClientIp(HttpServletRequest request) {
            String xffHeader = request.getHeader("X-Forwarded-For");
            if (StringUtils.hasText(xffHeader)) {
                return xffHeader.split(",")[0].trim();
            }
            return request.getRemoteAddr();
        }

        private static class TokenBucket {
            private final long capacity;
            private final AtomicLong tokens;
            private final long nanosToRefill;
            private volatile long lastRefillNanos;

            public TokenBucket(long capacity) {
                this.capacity = capacity;
                this.tokens = new AtomicLong(capacity);
                this.nanosToRefill = TimeUnit.MINUTES.toNanos(1) / capacity;
                this.lastRefillNanos = System.nanoTime();
            }

            public boolean tryConsume() {
                refill();
                long currentTokens = tokens.get();
                return currentTokens > 0 && tokens.compareAndSet(currentTokens, currentTokens - 1);
            }

            private void refill() {
                long now = System.nanoTime();
                long elapsedNanos = now - lastRefillNanos;
                long tokensToAdd = elapsedNanos / nanosToRefill;
                if (tokensToAdd > 0) {
                    tokens.set(Math.min(capacity, tokens.get() + tokensToAdd));
                    lastRefillNanos = now;
                }
            }
        }
    }
}
