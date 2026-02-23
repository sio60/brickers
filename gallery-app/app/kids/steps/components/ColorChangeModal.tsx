'use client';

import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import ThrottledDriver from "@/components/three/ThrottledDriver";
import LdrModel from "./LdrModel";
import { type ThemeInfo } from "@/lib/api/colorVariantApi";
import * as gtag from "@/lib/gtag";
import styles from '../KidsStepPage.module.css';

interface ColorChangeModalProps {
    t: any;
    isOpen: boolean;
    onClose: () => void;
    colorThemes: ThemeInfo[];
    selectedTheme: string;
    setSelectedTheme: (v: string) => void;
    customThemeInput: string;
    setCustomThemeInput: (v: string) => void;
    isApplyingColor: boolean;
    handleApplyColor: () => void;
    colorPreviewUrl: string | null;
    sortedBlobUrl: string | null;
    ldrUrl: string;
    perfProfile: any;
}

export default function ColorChangeModal({
    t,
    isOpen,
    onClose,
    colorThemes,
    selectedTheme,
    setSelectedTheme,
    customThemeInput,
    setCustomThemeInput,
    isApplyingColor,
    handleApplyColor,
    colorPreviewUrl,
    sortedBlobUrl,
    ldrUrl,
    perfProfile,
}: ColorChangeModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.galleryModalOverlay} onClick={onClose}>
            <div className={styles.colorModal__splitContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.colorModal__leftPanel}>
                    <button className={styles.modalCloseBtn} onClick={onClose}>\u2715</button>
                    <h3 className={styles.galleryModal__title}>{t.kids.steps.colorThemeTitle || "\uC0C9\uC0C1 \uD14C\uB9C8 \uC120\uD0DD"}</h3>
                    <div className={styles.colorModal__themes}>
                        {colorThemes.length === 0 ? <div className={styles.colorModal__loading}>{t.kids.steps?.themeLoading || t.common.loading}</div> : (
                            colorThemes.map((theme: ThemeInfo) => (
                                <button key={theme.name} className={`${styles.colorModal__themeBtn} ${selectedTheme === theme.name && !customThemeInput ? styles.selected : ""}`} onClick={() => { setSelectedTheme(theme.name); setCustomThemeInput(""); }}>
                                    <span className={styles.colorModal__themeName}>{theme.name}</span>
                                    <span className={styles.colorModal__themeDesc}>{theme.description}</span>
                                </button>
                            ))
                        )}
                    </div>
                    <div className={styles.colorModal__divider}>직접 입력</div>
                    <div className={styles.colorModal__customSection}>
                        <input
                            type="text"
                            className={styles.colorModal__customInput}
                            placeholder="크리스마스, 사이버펑크, 파스텔..."
                            value={customThemeInput}
                            onChange={(e) => {
                                setCustomThemeInput(e.target.value);
                                setSelectedTheme(e.target.value);
                            }}
                            onFocus={() => setSelectedTheme(customThemeInput)}
                        />
                    </div>
                    <div className={styles.galleryModal__actions}>
                        <button className={`${styles.galleryModal__btn} ${styles['galleryModal__btn--cancel']}`} onClick={() => {
                            gtag.trackExit("color_theme_modal", "modal_close");
                            onClose();
                        }}>닫기</button>
                        <button className={`${styles.galleryModal__btn} ${styles['galleryModal__btn--confirm']}`} onClick={handleApplyColor} disabled={!selectedTheme || isApplyingColor}>
                            {isApplyingColor ? "\uC801\uC6A9 \uC911..." : "\uC801\uC6A9\uD558\uAE30"}
                        </button>
                    </div>
                </div>
                <div className={styles.colorModal__rightPanel}>
                    <div className={styles.colorModal__previewLabel}>브릭 미리보기</div>
                    <Canvas
                        camera={{ position: [200, -200, 200], fov: 45, near: 0.1, far: 100000 }}
                        dpr={[1, 1.5]}
                        frameloop="demand"
                    >
                        <ThrottledDriver />
                        <ambientLight intensity={0.9} />
                        <directionalLight position={[3, 5, 2]} intensity={1} />
                        <LdrModel
                            url={colorPreviewUrl || sortedBlobUrl || ldrUrl}
                            stepMode={false}
                            onLoaded={() => {}}
                        />
                        <OrbitControls makeDefault enablePan={false} enableZoom />
                    </Canvas>
                </div>
            </div>
        </div>
    );
}
