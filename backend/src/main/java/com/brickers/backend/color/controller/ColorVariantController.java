package com.brickers.backend.color.controller;

import com.brickers.backend.color.dto.ColorVariantRequest;
import com.brickers.backend.color.dto.ColorVariantResponse;
import com.brickers.backend.color.dto.ThemeInfo;
import com.brickers.backend.color.service.ColorVariantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Color Variant", description = "색상 테마 변경 API")
@RestController
@RequestMapping("/api/color-variant")
@RequiredArgsConstructor
public class ColorVariantController {

    private final ColorVariantService colorVariantService;

    @Operation(summary = "테마 목록 조회", description = "사용 가능한 색상 테마 목록을 반환합니다.")
    @GetMapping("/themes")
    public ResponseEntity<List<ThemeInfo>> getThemes() {
        List<ThemeInfo> themes = colorVariantService.getThemes();
        return ResponseEntity.ok(themes);
    }

    @Operation(summary = "색상 테마 적용", description = "LDR 파일에 선택한 색상 테마를 적용합니다.")
    @PostMapping
    public ResponseEntity<ColorVariantResponse> applyColorVariant(@RequestBody ColorVariantRequest request) {
        ColorVariantResponse response = colorVariantService.applyColorVariant(request);

        if (response.isOk()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
}
