package com.brickers.backend.admin.gallery;

import com.brickers.backend.admin.gallery.dto.AdminGalleryPostDto;
import com.brickers.backend.admin.gallery.service.AdminGalleryService;
import com.brickers.backend.gallery.entity.Visibility;
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

    /** 전체 게시글 목록 (삭제된 것 포함) + 검색/필터 */
    @GetMapping
    public Page<AdminGalleryPostDto> getAllPosts(
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(name = "visibility", required = false) Visibility visibility,
            @RequestParam(name = "deleted", required = false) Boolean deleted,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size) {
        return adminGalleryService.getAllPosts(keyword, visibility, deleted, page, size);
    }

    /** 게시글 상세 */
    @GetMapping("/{id}")
    public AdminGalleryPostDto getPost(@PathVariable("id") String id) {
        return adminGalleryService.getPost(id);
    }

    /** 게시글 삭제 (Soft Delete) */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable("id") String id) {
        adminGalleryService.deletePost(id);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
    }

    /** 게시글 숨김 (블라인드) */
    @PostMapping("/{id}/hide")
    public ResponseEntity<?> hidePost(@PathVariable("id") String id) {
        adminGalleryService.hidePost(id);
        return ResponseEntity.ok(Map.of("message", "Post hidden"));
    }

    /** 게시글 숨김 해제 */
    @PostMapping("/{id}/unhide")
    public ResponseEntity<?> unhidePost(@PathVariable("id") String id) {
        adminGalleryService.unhidePost(id);
        return ResponseEntity.ok(Map.of("message", "Post unhidden (Public)"));
    }
}
