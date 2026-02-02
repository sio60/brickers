package com.brickers.backend.config;

import com.brickers.backend.auth.jwt.JwtAuthFilter;
import com.brickers.backend.auth.oauth.OAuth2LoginSuccessHandler;
import com.brickers.backend.security.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.List;

@EnableMethodSecurity(prePostEnabled = true)
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

        private final CustomOAuth2UserService customOAuth2UserService;
        private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
        private final JwtAuthFilter jwtAuthFilter;

        @Value("${app.front-base-url:http://localhost:3000}")
        private String frontBaseUrl;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf.disable())

                                // ✅ 100% Stateless (JWT 전용)
                                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                                // ✅ API는 401로 떨어지게 (/login redirect 방지)
                                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

                                .authorizeHttpRequests(auth -> auth
                                                // -------------------------------
                                                // ✅ Public
                                                // -------------------------------
                                                .requestMatchers("/", "/error", "/favicon.ico").permitAll()

                                                // Swagger 공개
                                                .requestMatchers(
                                                                "/swagger", "/swagger/**",
                                                                "/swagger-ui.html", "/swagger-ui/**",
                                                                "/v3/api-docs/**")
                                                .permitAll()

                                                // OAuth2 시작/콜백
                                                .requestMatchers("/auth/**").permitAll()

                                                // ✅ [New] System & Public APIs
                                                .requestMatchers("/api/health", "/api/config/public", "/api/errors")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/gallery/tags").permitAll()

                                                // Kids API 공개
                                                .requestMatchers(HttpMethod.POST, "/api/kids/render").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/kids/rendered/**").permitAll()

                                                // Chatbot 공개
                                                .requestMatchers("/api/chat/**").permitAll()

                                                // -------------------------------
                                                // ✅ Auth API
                                                // -------------------------------
                                                // .requestMatchers(HttpMethod.POST, "/api/auth/refresh",
                                                // "/api/auth/logout")
                                                // .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                                                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                                                .requestMatchers("/api/auth/refresh", "/api/auth/logout", "/api/auth/mobile/**").permitAll()
                                                // 토큰 상태 확인 (공개 - 토큰 없어도 확인 가능)
                                                .requestMatchers(HttpMethod.GET, "/api/auth/status").permitAll()
                                                // 모든 세션 로그아웃 (인증 필요)
                                                .requestMatchers(HttpMethod.POST, "/api/auth/logout-all")
                                                .authenticated()
                                                // 로그인 이력 (인증 필요)
                                                .requestMatchers(HttpMethod.GET, "/api/auth/logins").authenticated()
                                                // ✅ [보안 강화] Actuator는 관리자만 접근 가능
                                                .requestMatchers("/actuator/**").hasRole("ADMIN")

                                                // -------------------------------
                                                // ✅ Users API (공개 프로필)
                                                // -------------------------------
                                                .requestMatchers(HttpMethod.GET, "/api/users/check-nickname",
                                                                "/api/users/check-email",
                                                                "/api/users/*",
                                                                "/api/users/*/summary")
                                                .permitAll()

                                                // -------------------------------
                                                // ✅ My API (JWT 필요)
                                                // -------------------------------
                                                .requestMatchers("/api/my/**").authenticated()

                                                // -------------------------------
                                                // ✅ Gallery API 정책 (핵심)
                                                // -------------------------------

                                                // ✅ 내 목록(GET이지만 인증 필요)
                                                .requestMatchers(HttpMethod.GET, "/api/gallery/my",
                                                                "/api/gallery/bookmarks/my")
                                                .authenticated()

                                                // ✅ 북마크/리액션 토글(인증 필요)
                                                .requestMatchers(HttpMethod.POST, "/api/gallery/*/bookmark",
                                                                "/api/gallery/*/reaction")
                                                .authenticated()

                                                // ✅ 게시글 생성/수정/삭제(인증 필요)
                                                .requestMatchers(HttpMethod.POST, "/api/gallery").authenticated()
                                                .requestMatchers(HttpMethod.PATCH, "/api/gallery/*").authenticated()
                                                .requestMatchers(HttpMethod.DELETE, "/api/gallery/*").authenticated()

                                                // ✅ 공개 갤러리 조회/검색/상세/댓글은 공개
                                                .requestMatchers(HttpMethod.GET, "/api/gallery", "/api/gallery/search",
                                                                "/api/gallery/*", "/api/gallery/*/comments")
                                                .permitAll()

                                                // ✅ Upload API (테스트용 공개)
                                                .requestMatchers(HttpMethod.POST, "/api/uploads/**").permitAll()

                                                // ✅ 업로드된 파일 서빙 및 AI 생성 결과물 공개 (로컬 프록시 포함)
                                                .requestMatchers(HttpMethod.GET, "/api/uploads/**", "/uploads/**")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/generated/**").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/proxy-image").permitAll()

                                                // -------------------------------
                                                // ✅ Report API (신고)
                                                // -------------------------------
                                                // 신고 사유 목록은 공개
                                                .requestMatchers(HttpMethod.GET, "/api/reports/reasons").permitAll()
                                                // 나머지 신고 API는 인증 필요
                                                .requestMatchers("/api/reports/**").authenticated()

                                                // -------------------------------
                                                // ✅ Inquiry API (문의)
                                                // -------------------------------
                                                .requestMatchers("/api/inquiries/**").authenticated()

                                                // -------------------------------
                                                // ✅ Payment API (일회성 결제)
                                                // -------------------------------
                                                // 요금제 목록 및 웹훅은 공개 (웹훅은 내부 IP 체크 등 추가 보안 권장)
                                                .requestMatchers(HttpMethod.GET, "/api/payments/plans").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/payments/webhook").permitAll()
                                                .requestMatchers("/api/payments/**").authenticated()
                                                // ✅ preflight는 무조건 통과 (JWT 필터/시큐리티에서 401 막기)
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                                // ✅ Kids API 공개 (네 실제 매핑 경로에 맞춰 추가)
                                                .requestMatchers("/api/v1/kids/**").permitAll()
                                                .requestMatchers("/api/kids/**").permitAll()

                                                // -------------------------------
                                                // ✅ Color Variant API
                                                // -------------------------------
                                                // 테마 목록은 공개
                                                .requestMatchers(HttpMethod.GET, "/api/color-variant/themes").permitAll()
                                                // 색상 변경은 인증 필요
                                                .requestMatchers(HttpMethod.POST, "/api/color-variant").authenticated()

                                                // -------------------------------
                                                // ✅ Billing API (구독 결제)
                                                // -------------------------------
                                                // 요금제 목록 및 웹훅은 공개
                                                .requestMatchers(HttpMethod.GET, "/api/billing/plans").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/billing/webhook").permitAll()
                                                // 테스트용 (개발 환경에서만 - 배포 시 제거)
                                                .requestMatchers("/api/billing/test/**").permitAll()
                                                .requestMatchers("/api/billing/**").authenticated()

                                                // -------------------------------
                                                // ✅ Admin API
                                                // -------------------------------
                                                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                                                // -------------------------------
                                                // ✅ 나머지는 인증
                                                // -------------------------------
                                                .anyRequest().authenticated())

                                .oauth2Login(oauth2 -> oauth2
                                                .authorizationEndpoint(a -> a.baseUri("/auth"))
                                                .redirectionEndpoint(r -> r.baseUri("/auth/*/callback"))
                                                .userInfoEndpoint(u -> u.userService(customOAuth2UserService))
                                                .successHandler(oAuth2LoginSuccessHandler)
                                                .failureUrl(frontBaseUrl + "/auth/failure"))

                                // ✅ JWT 필터 (Bearer 토큰 처리)
                                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration config = new CorsConfiguration();
                config.setAllowedOriginPatterns(List.of(
                                "http://localhost:5173",
                                "http://localhost:3000",
                                "https://brickers.shop",
                                "https://www.brickers.shop"));
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                // config.setAllowedHeaders(List.of("Authorization", "Content-Type",
                // "X-Requested-With"));
                // config.setExposedHeaders(List.of("Location"));

                // ✅ 보안 권장: 허용된 헤더를 명시적으로 제한
                config.setAllowedHeaders(List.of("*"
                // "Authorization",
                // "Cache-Control",
                // "Content-Type",
                // "X-Requested-With"
                ));

                config.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", config);
                return source;
        }
}
