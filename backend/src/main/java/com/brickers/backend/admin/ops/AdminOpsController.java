package com.brickers.backend.admin.ops;

import com.brickers.backend.admin.ops.service.AdminOpsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/ops")
@RequiredArgsConstructor
public class AdminOpsController {

    private final AdminOpsService adminOpsService;

    /** 큐 상태 모니터링 */
    @GetMapping("/queue")
    public Map<String, Object> getQueueStatus() {
        return adminOpsService.getQueueStatus();
    }

    /** 도안 생성 로그 조회 (Real - Failed Jobs from DB) */
    @GetMapping("/logs/blueprints")
    public ResponseEntity<?> getBlueprintLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminOpsService.getBlueprintLogs(page, size));
    }

    /** 시스템 캐시 초기화 (Real) */
    @PostMapping("/cache/clear")
    public ResponseEntity<?> clearCache() {
        return ResponseEntity.ok(adminOpsService.clearCache());
    }
}
