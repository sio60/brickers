package com.brickers.backend.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.HttpRequestMethodNotSupportedException;

import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

        // ✅ 400: 비즈니스 검증 실패 (ex. "이미 처리된 신고는 취소 불가")
        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<ApiError> handleIllegalArgument(
                        IllegalArgumentException e,
                        HttpServletRequest req) {
                log.error("IllegalArgumentException at {}: ", req.getRequestURI(), e);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(ApiError.of(HttpStatus.BAD_REQUEST, "BAD_REQUEST", e.getMessage(),
                                                req.getRequestURI()));
        }

        // ✅ 404: 데이터 없음 (Optional.orElseThrow()에서 발생 가능)
        @ExceptionHandler(java.util.NoSuchElementException.class)
        public ResponseEntity<ApiError> handleNoSuchElement(
                        java.util.NoSuchElementException e,
                        HttpServletRequest req) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(ApiError.of(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(),
                                                req.getRequestURI()));
        }

        // ✅ 403: 권한 없음 (로그인 필요 / 탈퇴 계정 등)
        @ExceptionHandler(com.brickers.backend.common.exception.ForbiddenException.class)
        public ResponseEntity<ApiError> handleForbidden(
                        com.brickers.backend.common.exception.ForbiddenException e,
                        HttpServletRequest req) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(ApiError.of(HttpStatus.FORBIDDEN, "FORBIDDEN", e.getMessage(),
                                                req.getRequestURI()));
        }

        // ✅ 400: @Valid 바인딩 실패 (request body 검증)
        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ApiError> handleMethodArgumentNotValid(
                        MethodArgumentNotValidException e,
                        HttpServletRequest req) {
                Map<String, String> fieldErrors = e.getBindingResult()
                                .getFieldErrors()
                                .stream()
                                .collect(Collectors.toMap(
                                                fe -> fe.getField(),
                                                fe -> fe.getDefaultMessage() == null ? "invalid"
                                                                : fe.getDefaultMessage(),
                                                (a, b) -> a));

                ApiError body = ApiError.of(
                                HttpStatus.BAD_REQUEST,
                                "VALIDATION_ERROR",
                                "요청 값이 올바르지 않습니다.",
                                req.getRequestURI());
                body.setDetails(fieldErrors);

                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
        }

        // ✅ 400: @RequestParam / @PathVariable 검증 등 (필요시)
        @ExceptionHandler(ConstraintViolationException.class)
        public ResponseEntity<ApiError> handleConstraintViolation(
                        ConstraintViolationException e,
                        HttpServletRequest req) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                .body(ApiError.of(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", e.getMessage(),
                                                req.getRequestURI()));
        }

        // ✅ 500: 나머지 예외 (로그 남기고 500)
        @ExceptionHandler(Exception.class)
        public ResponseEntity<ApiError> handleException(
                        Exception e,
                        HttpServletRequest req) {
                log.error("Unhandled error at {} {}", req.getMethod(), req.getRequestURI(), e);
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body(ApiError.of(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 오류",
                                                req.getRequestURI()));
        }

        // ✅ 404: 존재하지 않는 경로 (/actuator/health 등)
        @ExceptionHandler(NoResourceFoundException.class)
        public ResponseEntity<ApiError> handleNoResourceFound(
                        NoResourceFoundException e,
                        HttpServletRequest req) {

                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(ApiError.of(
                                                HttpStatus.NOT_FOUND,
                                                "NOT_FOUND",
                                                "존재하지 않는 경로입니다.",
                                                req.getRequestURI()));
        }

        // ✅ 405: 잘못된 HTTP Method (GET → POST만 허용 등)
        @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
        public ResponseEntity<ApiError> handleMethodNotSupported(
                        HttpRequestMethodNotSupportedException e,
                        HttpServletRequest req) {

                return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                                .body(ApiError.of(
                                                HttpStatus.METHOD_NOT_ALLOWED,
                                                "METHOD_NOT_ALLOWED",
                                                "지원하지 않는 HTTP 메서드입니다.",
                                                req.getRequestURI()));
        }

        @ExceptionHandler(IllegalStateException.class)
        public ResponseEntity<ApiError> handleIllegalState(
                        IllegalStateException e,
                        HttpServletRequest req) {
                // retry not allowed 같은 "상태 전이 불가"는 409가 맞음
                return ResponseEntity.status(HttpStatus.CONFLICT)
                                .body(ApiError.of(HttpStatus.CONFLICT, "CONFLICT", e.getMessage(),
                                                req.getRequestURI()));
        }

        @Data
        @Builder
        public static class ApiError {
                private Instant timestamp;
                private int status;
                private String error;
                private String code;
                private String message;
                private String path;

                // field error 같은 추가 정보
                private Object details;

                public static ApiError of(HttpStatus status, String code, String message, String path) {
                        return ApiError.builder()
                                        .timestamp(Instant.now())
                                        .status(status.value())
                                        .error(status.getReasonPhrase())
                                        .code(code)
                                        .message(message)
                                        .path(path)
                                        .build();
                }
        }
}
