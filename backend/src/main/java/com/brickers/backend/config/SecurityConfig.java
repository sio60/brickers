package com.brickers.backend.config;

import com.brickers.backend.security.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
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

                                // ✅ API는 401로 떨어지게 (기본 /login 리다이렉트 방지)
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint(
                                                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))

                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/", "/error", "/favicon.ico").permitAll()
                                                .requestMatchers("/auth/**", "/logout").permitAll()
                                                .requestMatchers("/api/auth/me").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/gallery/**").permitAll()
                                                .requestMatchers("/api/gallery/**").authenticated()

                                                // ✅ Swagger 공개
                                                .requestMatchers(
                                                                "/swagger", "/swagger/**",
                                                                "/swagger-ui.html", "/swagger-ui/**",
                                                                "/v3/api-docs/**")
                                                .permitAll()

                                                // ✅ Kids API 공개
                                                .requestMatchers(HttpMethod.POST, "/api/kids/render").permitAll()
                                                .requestMatchers(HttpMethod.GET, "/api/kids/rendered/**").permitAll()

                                                .anyRequest().authenticated())

                                .oauth2Login(oauth2 -> oauth2
                                                .authorizationEndpoint(a -> a.baseUri("/auth"))
                                                .redirectionEndpoint(r -> r.baseUri("/auth/*/callback"))
                                                .userInfoEndpoint(u -> u.userService(customOAuth2UserService))
                                                .defaultSuccessUrl(frontBaseUrl + "/auth/success", true)
                                                .failureUrl(frontBaseUrl + "/auth/failure"))

                                .logout(logout -> logout
                                                .logoutUrl("/logout")
                                                .invalidateHttpSession(true)
                                                .clearAuthentication(true)
                                                .deleteCookies("JSESSIONID")
                                                .logoutSuccessUrl(frontBaseUrl));

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
                config.setAllowedHeaders(List.of("*"));
                config.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", config);
                return source;
        }
}
