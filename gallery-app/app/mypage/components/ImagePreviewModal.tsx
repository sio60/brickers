'use client';

import React from "react";
import styles from "../MyPage.module.css";

interface ImagePreviewModalProps {
    previewImage: string | null;
    onClose: () => void;
}

export default function ImagePreviewModal({
    previewImage,
    onClose,
}: ImagePreviewModalProps) {
    if (!previewImage) return null;

    return (
        <div className={styles.mypage__imagePreviewOverlay} onClick={onClose}>
            <button
                className={styles.mypage__imagePreviewClose}
                onClick={onClose}
            >
                ✕
            </button>
            <img
                src={previewImage}
                alt="Original"
                className={styles.mypage__imagePreviewImg}
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}
