package com.brickers.backend.config;

import com.brickers.backend.security.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security 설정
 * OAuth2 소셜 로그인 (카카오, 구글) 지원
 * 
 * 로그인 엔드포인트:
 * - 카카오: /auth/kakao
 * - 구글: /auth/google
 * 
 * 로그인 성공 시 프론트엔드로 리다이렉트:
 * - http://localhost:3000/auth/success
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CORS 설정
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // CSRF 비활성화 (REST API)
                .csrf(csrf -> csrf.disable())

                // 권한 설정
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/auth/**", "/api/**").permitAll()
                        .requestMatchers("/oauth2/**", "/login/**", "/logout").permitAll()
                        .anyRequest().permitAll())

                // OAuth2 로그인 설정
                .oauth2Login(oauth2 -> oauth2
                        .authorizationEndpoint(authorization -> authorization.baseUri("/auth"))
                        .redirectionEndpoint(redirection -> redirection.baseUri("/auth/*/callback"))
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        // 로그인 성공 시 프론트엔드로 리다이렉트
                        .defaultSuccessUrl("http://localhost:3000/auth/success", true)
                        .failureUrl("http://localhost:3000/auth/failure"))

                // 로그아웃 설정
                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("http://localhost:3000")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID"));

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:5173"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
