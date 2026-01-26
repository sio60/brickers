package com.brickers.backend.admin.gallery;

import com.brickers.backend.admin.gallery.dto.AdminGalleryPostDto;
import com.brickers.backend.admin.gallery.service.AdminGalleryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/gallery")
@RequiredArgsConstructor
public class AdminGalleryController {

    private final AdminGalleryService adminGalleryService;

    /** 전체 게시글 목록 (삭제된 것 포함) */
    @GetMapping
    public Page<AdminGalleryPostDto> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminGalleryService.getAllPosts(page, size);
    }

    /** 게시글 상세 */
    @GetMapping("/{id}")
    public AdminGalleryPostDto getPost(@PathVariable String id) {
        return adminGalleryService.getPost(id);
    }

    /** 게시글 삭제 (Soft Delete) */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable String id) {
        adminGalleryService.deletePost(id);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
    }

    /** 게시글 숨김 (블라인드) */
    @PostMapping("/{id}/hide")
    public ResponseEntity<?> hidePost(@PathVariable String id) {
        adminGalleryService.hidePost(id);
        return ResponseEntity.ok(Map.of("message", "Post hidden"));
    }

    /** 게시글 숨김 해제 */
    @PostMapping("/{id}/unhide")
    public ResponseEntity<?> unhidePost(@PathVariable String id) {
        adminGalleryService.unhidePost(id);
        return ResponseEntity.ok(Map.of("message", "Post unhidden (Public)"));
    }
}
