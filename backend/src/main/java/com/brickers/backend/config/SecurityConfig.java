package com.brickers.backend.config;

import com.brickers.backend.security.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

    /**
     * ✅ 프론트 베이스 URL (로컬/배포 분리)
     * - 로컬: http://localhost:5173
     * - 배포: https://brickers.shop
     */
    @Value("${app.front-base-url:http://localhost:5173}")
    private String frontBaseUrl;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/error", "/favicon.ico", "/auth/**").permitAll()
                .requestMatchers("/api/auth/me").permitAll()
                .requestMatchers("/logout").permitAll()
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
                .invalidateHttpSession(true)      // ⭐ 세션 무효화
                .clearAuthentication(true)        // ⭐ 인증 정보 제거
                .deleteCookies("JSESSIONID")       // ⭐ 쿠키 삭제
                .logoutSuccessUrl(frontBaseUrl)
            );
                return http.build();
        }

    /**
     * ✅ CORS: 로컬 + 배포 도메인 둘 다 허용
     * 같은 도메인(https://brickers.shop)에서 프론트+백 프록시로 붙으면 사실 CORS 필요 없지만,
     * 환경 꼬였을 때 대비해서 열어둠.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // ✅ allowedOrigins 대신 allowedOriginPatterns 쓰면 관리가 편함
        config.setAllowedOriginPatterns(List.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "https://brickers.shop",
            "https://www.brickers.shop"
            // 백엔드가 api 서브도메인이면 아래도 추가:
            // "https://api.brickers.shop"
        ));

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
