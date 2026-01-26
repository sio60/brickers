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
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

        private final CustomOAuth2UserService customOAuth2UserService;
        private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
        private final JwtAuthFilter jwtAuthFilter;

        @Value("${app.front-base-url:http://localhost:5173}")
        private String frontBaseUrl;

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .csrf(csrf -> csrf.disable())

                                // ✅ OAuth2 플로우는 세션이 필요할 수 있음
                                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

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

                                                // Kids API 공개
                                                .requestMatchers(HttpMethod.POST, "/api/kids/render").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/kids/rendered/**").permitAll()

                                                // Chatbot 공개
                                                .requestMatchers("/api/chat/**").permitAll()

                                                // -------------------------------
                                                // ✅ Auth API
                                                // -------------------------------
                                                .requestMatchers(HttpMethod.POST, "/api/auth/refresh",
                                                                "/api/auth/logout")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()

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

                                                // ✅ 공개 갤러리 조회/검색/상세는 공개
                                                .requestMatchers(HttpMethod.GET, "/api/gallery", "/api/gallery/search",
                                                                "/api/gallery/*")
                                                .permitAll()

                                                // ✅ Upload API (인증 필요)
                                                .requestMatchers(HttpMethod.POST, "/api/uploads/**").authenticated()

                                                // ✅ 업로드된 파일 서빙은 공개(또는 필요시 인증)
                                                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()

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
                                                // ✅ Payment API (결제)
                                                // -------------------------------
                                                // 요금제 목록 및 웹훅은 공개 (웹훅은 내부 IP 체크 등 추가 보안 권장)
                                                .requestMatchers(HttpMethod.GET, "/api/payments/plans").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/payments/webhook").permitAll()
                                                .requestMatchers("/api/payments/**").authenticated()

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

                // ✅ 지금 단계에선 * 허용 OK (추후 Authorization/Content-Type 정도로 제한 가능)
                config.setAllowedHeaders(List.of("*"));

                config.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", config);
                return source;
        }
}
