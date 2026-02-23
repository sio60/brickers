'use client';

import { useState } from "react";
import * as gtag from "@/lib/gtag";
import styles from '../KidsStepPage.module.css';

function GalleryRegisterInputModalAdapter({ t, onRegister, isSubmitting, onClose }: any) {
    const [title, setTitle] = useState("");
    return (
        <>
            <input type="text" className={styles.galleryModal__input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.kids.steps.galleryModal.placeholder} autoFocus />
            <div className={styles.galleryModal__actions}>
                <button className={`${styles.galleryModal__btn} ${styles['galleryModal__btn--cancel']}`} onClick={onClose}>{t.kids.steps.galleryModal.cancel}</button>
                <button className={`${styles.galleryModal__btn} ${styles['galleryModal__btn--confirm']}`} onClick={() => onRegister(title)} disabled={isSubmitting}>{isSubmitting ? "..." : t.kids.steps.galleryModal.confirm}</button>
            </div>
        </>
    );
}

interface GalleryRegisterModalProps {
    t: any;
    isOpen: boolean;
    onClose: () => void;
    onRegister: (title: string) => void;
    isSubmitting: boolean;
}

export default function GalleryRegisterModal({
    t,
    isOpen,
    onClose,
    onRegister,
    isSubmitting,
}: GalleryRegisterModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.galleryModalOverlay} onClick={onClose}>
            <div className={styles.galleryModal} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.galleryModal__title}>{t.kids.steps.galleryModal.title}</h3>
                <GalleryRegisterInputModalAdapter
                    t={t}
                    onRegister={onRegister}
                    isSubmitting={isSubmitting}
                    onClose={() => {
                        gtag.trackExit("gallery_register_modal", "modal_close");
                        onClose();
                    }}
                />
            </div>
        </div>
    );
}
