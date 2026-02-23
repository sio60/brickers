package com.brickers.backend.admin.service;

import com.brickers.backend.admin.dto.AdminGalleryPostDto;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminGalleryService {

    private final GalleryPostRepository galleryPostRepository;

    @Transactional(readOnly = true)
    public Page<AdminGalleryPostDto> getAllPosts(String keyword, Visibility visibility, Boolean deleted, int page,
            int size) {
        boolean isDeleted = deleted != null && deleted; // Default false
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        if (keyword != null && !keyword.isBlank()) {
            if (visibility != null) {
                return galleryPostRepository.searchAdmin(keyword, visibility, isDeleted, pageable)
                        .map(AdminGalleryPostDto::from);
            } else {
                return galleryPostRepository.searchAdminNoVisibility(keyword, isDeleted, pageable)
                        .map(AdminGalleryPostDto::from);
            }
        } else {
            if (visibility != null) {
                return galleryPostRepository.findByVisibilityAndDeleted(visibility, isDeleted, pageable)
                        .map(AdminGalleryPostDto::from);
            } else {
                return galleryPostRepository.findByDeleted(isDeleted, pageable)
                        .map(AdminGalleryPostDto::from);
            }
        }
    }

    @Transactional(readOnly = true)
    public AdminGalleryPostDto getPost(String id) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));
        return AdminGalleryPostDto.from(post);
    }

    @Transactional
    public void deletePost(String id) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setDeleted(true);
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
    }

    @Transactional
    public void hidePost(String id) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setVisibility(Visibility.PRIVATE); // Assuming PRIVATE for hide as per previous code, or define
                                                // BLIND/HIDDEN
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
    }

    @Transactional
    public void unhidePost(String id) {
        GalleryPostEntity post = galleryPostRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Post not found"));

        post.setVisibility(Visibility.PUBLIC);
        post.setUpdatedAt(LocalDateTime.now());
        galleryPostRepository.save(post);
    }
}
