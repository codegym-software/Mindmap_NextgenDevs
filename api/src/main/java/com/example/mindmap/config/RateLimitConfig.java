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

    @Value("${app.rate-limit.requests-per-minute:120}")
    private int requestsPerMinute;

    @Value("${app.rate-limit.cache.duration-minutes:10}")
    private int cacheDurationMinutes;

    @Value("${app.rate-limit.cache.max-size:10000}")
    private long cacheMaxSize;

    /**
     * ✅ Chỉ đăng ký filter khi app.rate-limit.enabled=true
     * 🚫 Không return FilterRegistrationBean chứa filter null (gây lỗi khởi động)
     */
    @Bean
    @ConditionalOnProperty(value = "app.rate-limit.enabled", havingValue = "true")
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilter() {

        log.info("✅ Giới hạn tốc độ được bật: {} yêu cầu/phút mỗi IP", requestsPerMinute);

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

            // ✅ Bypass OPTIONS (Pre-flight CORS)
            if (HttpMethod.OPTIONS.matches(httpRequest.getMethod())) {
                chain.doFilter(request, response);
                return;
            }

            String clientIp = resolveClientIp(httpRequest);
            TokenBucket bucket = rateLimitCache.get(clientIp, key -> new TokenBucket(requestsPerMinute));

            if (bucket.tryConsume()) {
                chain.doFilter(request, response);
            } else {
                log.warn("🚫 Vượt quá giới hạn tốc độ cho IP: {}", clientIp);
                httpResponse.setStatus(429);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write(
                        "{\"error\":\"rate_limit_exceeded\",\"message\":\"Quá nhiều yêu cầu mỗi phút\"}"
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
