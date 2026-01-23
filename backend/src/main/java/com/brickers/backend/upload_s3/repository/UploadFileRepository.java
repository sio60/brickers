package com.brickers.backend.upload_s3.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.brickers.backend.upload_s3.entity.UploadFile;

public interface UploadFileRepository extends MongoRepository<UploadFile, String> {
}
