package com.brickers.backend.admin.gallery.service;

import com.brickers.backend.admin.gallery.dto.AdminGalleryPostDto;
import com.brickers.backend.gallery.entity.GalleryPostEntity;
import com.brickers.backend.gallery.entity.Visibility;
import com.brickers.backend.gallery.repository.GalleryPostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminGalleryService {

    private final GalleryPostRepository galleryPostRepository;

    @Transactional(readOnly = true)
    public Page<AdminGalleryPostDto> getAllPosts(int page, int size) {
        return galleryPostRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(AdminGalleryPostDto::from);
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
