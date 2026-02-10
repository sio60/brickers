'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './KidsDrawingCanvas.module.css';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
    onCancel: () => void;
    onDone: (file: File) => void;
};

const COLORS = [
    '#000000', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500',
    '#800080', '#ffffff'
];

export default function KidsDrawingCanvas({ onCancel, onDone }: Props) {
    const { t } = useLanguage();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(10);
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 초기 배경 흰색으로 채우기 (투명 배경 방지)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx?.beginPath();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 초기 배경을 흰색으로 설정 (AI 서버 전송 시 투명도 문제 방지)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        // 스케일 계산 (CSS 크기와 캔버스 좌표 크기 차이 보정)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getPos(e);

        ctx.lineWidth = brushSize;
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const handleDone = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'drawing.png', { type: 'image/png' });
                onDone(file);
            }
        }, 'image/png');
    };

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <div className={styles.tools}>
                    <button
                        className={`${styles.toolBtn} ${tool === 'brush' ? styles.active : ''}`}
                        onClick={() => setTool('brush')}
                    >
                        🎨 {t.kids.modelSelect.drawTool.brush}
                    </button>
                    <button
                        className={`${styles.toolBtn} ${tool === 'eraser' ? styles.active : ''}`}
                        onClick={() => setTool('eraser')}
                    >
                        🧽 {t.kids.modelSelect.drawTool.eraser}
                    </button>
                    <button className={styles.clearBtn} onClick={handleClear}>
                        🧹 {t.kids.modelSelect.drawTool.clear}
                    </button>
                </div>

                <div className={styles.divider} />

                <div className={styles.pallete}>
                    {COLORS.map(c => (
                        <button
                            key={c}
                            className={`${styles.colorBtn} ${color === c && tool === 'brush' ? styles.colorActive : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => {
                                setColor(c);
                                setTool('brush');
                            }}
                        />
                    ))}
                </div>

                <div className={styles.divider} />

                <div className={styles.sizeControl}>
                    <label>{t.kids.modelSelect.drawTool.size}</label>
                    <input
                        type="range"
                        min="2" max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    />
                    <span className={styles.sizeValue}>{brushSize}px</span>
                </div>
            </div>

            <div className={styles.canvasArea} style={{ flex: 1, minHeight: 0 }}>
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={900}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className={styles.canvas}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '8px' }}
                />
            </div>

            <div className={styles.footer} style={{ marginTop: '10px' }}>
                <button className={styles.cancelBtn} onClick={onCancel}>
                    {t.common.cancel}
                </button>
                <button
                    className={styles.doneBtn}
                    onClick={handleDone}
                    style={{ backgroundColor: '#000000', color: '#ffffff', border: '1px solid #000' }}
                >
                    {t.kids.modelSelect.drawTool.done}
                </button>
            </div>
        </div>
    );
}
