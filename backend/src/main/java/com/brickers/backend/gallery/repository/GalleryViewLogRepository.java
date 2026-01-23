package com.brickers.backend.gallery.repository;

import com.brickers.backend.gallery.entity.GalleryViewLogEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface GalleryViewLogRepository extends MongoRepository<GalleryViewLogEntity, String> {
}
