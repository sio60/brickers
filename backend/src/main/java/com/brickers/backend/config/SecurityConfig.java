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
                                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/", "/error", "/favicon.ico").permitAll()

                                                // OAuth2 시작/콜백
                                                .requestMatchers("/auth/**").permitAll()

                                                // ✅ auth API: refresh/logout는 permitAll, me는 인증 필요
                                                .requestMatchers(HttpMethod.POST, "/api/auth/refresh",
                                                                "/api/auth/logout")
                                                .permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()

                                                // 나머지 정책은 기존대로
                                                .requestMatchers(HttpMethod.GET, "/api/gallery/**").permitAll()
                                                .requestMatchers("/api/gallery/**").authenticated()

                                                .requestMatchers("/swagger", "/swagger/**", "/swagger-ui.html",
                                                                "/swagger-ui/**", "/v3/api-docs/**")
                                                .permitAll()

                                                .requestMatchers(HttpMethod.POST, "/api/kids/render").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/kids/rendered/**").permitAll()

                                                .anyRequest().authenticated())

                                .oauth2Login(oauth2 -> oauth2
                                                .authorizationEndpoint(a -> a.baseUri("/auth"))
                                                .redirectionEndpoint(r -> r.baseUri("/auth/*/callback"))
                                                .userInfoEndpoint(u -> u.userService(customOAuth2UserService))
                                                .successHandler(oAuth2LoginSuccessHandler)
                                                .failureUrl(frontBaseUrl + "/auth/failure"))

                                // ✅ 이게 없으면 JWT 인증 자체가 안 됨
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
                config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
                config.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", config);
                return source;
        }
}
