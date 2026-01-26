package com.brickers.backend.admin.gallery;

import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RestController
@RequestMapping("/api/admin/gallery")
@RequiredArgsConstructor
public class AdminGalleryController {

    private final GalleryPostRepository galleryPostRepository;

    /** 전체 게시글 목록 (삭제된 것 포함) */
    @GetMapping
    public Page<GalleryPostEntity> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return galleryPostRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    /** 게시글 상세 */
    @GetMapping("/{id}")
    public GalleryPostEntity getPost(@PathVariable String id) {
        return galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
    }

    /** 게시글 삭제 (Soft Delete) */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable String id) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setDeleted(true);
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
        return ResponseEntity.ok(Map.of("message", "Deleted successfully"));
    }

    /** 게시글 숨김 (블라인드) */
    @PostMapping("/{id}/hide")
    public ResponseEntity<?> hidePost(@PathVariable String id) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setVisibility(Visibility.PRIVATE); // 또는 BLIND가 있다면 BLIND
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
        return ResponseEntity.ok(Map.of("message", "Post hidden"));
    }

    /** 게시글 숨김 해제 */
    @PostMapping("/{id}/unhide")
    public ResponseEntity<?> unhidePost(@PathVariable String id) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setVisibility(Visibility.PUBLIC); // 원래 상태로 복구? 일단 PUBLIC
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
        return ResponseEntity.ok(Map.of("message", "Post unhidden (Public)"));
    }
}
