package com.brickers.backend.config;

import com.brickers.backend.security.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;

    @Value("${app.front-base-url:http://localhost:5173}")
    private String frontBaseUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())

            .authorizeHttpRequests(auth -> auth
                // ✅ 기본 공개
                .requestMatchers("/", "/error", "/favicon.ico", "/auth/**").permitAll()
                .requestMatchers("/api/auth/me").permitAll()
                .requestMatchers("/logout").permitAll()

                // ✅ Kids: 업로드 렌더 API (원하면 공개/인증 선택)
                // 지금은 프론트에서 누구나 쓰는 흐름이면 일단 열어둬도 됨
                .requestMatchers(HttpMethod.POST, "/api/kids/render").permitAll()

                // ✅ Kids: 결과 이미지 정적 서빙은 무조건 공개(브라우저 <img>가 쿠키 없이도 요청함)
                .requestMatchers(HttpMethod.GET, "/api/kids/rendered/**").permitAll()

                // ✅ 그 외는 인증
                .anyRequest().authenticated()
            )

            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(auth -> auth.baseUri("/auth"))
                .redirectionEndpoint(red -> red.baseUri("/auth/*/callback"))
                .userInfoEndpoint(user -> user.userService(customOAuth2UserService))
                .defaultSuccessUrl(frontBaseUrl + "/auth/success", true)
                .failureUrl(frontBaseUrl + "/auth/failure")
            )

            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl(frontBaseUrl)
                .deleteCookies("JSESSIONID")
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "https://brickers.shop",
            "https://www.brickers.shop"
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
