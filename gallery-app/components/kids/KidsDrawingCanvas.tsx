'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

function buildCursor(tool: 'brush' | 'eraser', size: number, color: string): string {
    // 캔버스 내부 좌표(1200x900) 대비 화면 표시 크기를 고려해 커서 크기 축소
    const displaySize = Math.max(4, Math.min(size * 0.6, 48));
    const svgSize = Math.ceil(displaySize + 4);
    const center = svgSize / 2;

    let svg: string;
    if (tool === 'eraser') {
        const half = displaySize / 2;
        svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgSize}' height='${svgSize}'>` +
            `<rect x='${center - half}' y='${center - half}' width='${displaySize}' height='${displaySize}' ` +
            `fill='white' stroke='%23999' stroke-width='1.5' rx='2'/>` +
            `</svg>`;
    } else {
        const r = displaySize / 2;
        const strokeColor = color === '#ffffff' ? '%23999' : color.replace('#', '%23');
        svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${svgSize}' height='${svgSize}'>` +
            `<circle cx='${center}' cy='${center}' r='${r}' ` +
            `fill='${color.replace('#', '%23')}' fill-opacity='0.4' ` +
            `stroke='${strokeColor}' stroke-width='1.5'/>` +
            `</svg>`;
    }

    return `url("data:image/svg+xml,${svg}") ${center} ${center}, crosshair`;
}

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

    const cursorStyle = useMemo(() => buildCursor(tool, brushSize, color), [tool, brushSize, color]);

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
        <div className="flex flex-col h-full gap-4 bg-white">
            <div className="flex flex-wrap items-center gap-4 p-3 bg-[#f1f3f5] rounded-xl">
                <div className="flex gap-2">
                    <button
                        className={`px-4 py-2 rounded-lg border cursor-pointer font-bold text-sm ${tool === 'brush' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-[#dee2e6]'}`}
                        onClick={() => setTool('brush')}
                    >
                        {t.kids.modelSelect.drawTool.brush}
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg border cursor-pointer font-bold text-sm ${tool === 'eraser' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-[#dee2e6]'}`}
                        onClick={() => setTool('eraser')}
                    >
                        {t.kids.modelSelect.drawTool.eraser}
                    </button>
                    <button
                        className="px-4 py-2 rounded-lg border border-[#dee2e6] bg-white cursor-pointer font-bold text-sm"
                        onClick={handleClear}
                    >
                        {t.kids.modelSelect.drawTool.clear}
                    </button>
                </div>

                <div className="w-px h-6 bg-[#dee2e6]" />

                <div className="flex gap-1.5 flex-wrap">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            className={`w-6 h-6 rounded-full border-2 border-white cursor-pointer p-0 ${color === c && tool === 'brush' ? 'shadow-[0_0_0_2px_#3b82f6]' : 'shadow-[0_0_0_1px_#dee2e6]'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => {
                                setColor(c);
                                setTool('brush');
                            }}
                        />
                    ))}
                </div>

                <div className="w-px h-6 bg-[#dee2e6]" />

                <div className="flex items-center gap-2 text-sm font-bold">
                    <label>{t.kids.modelSelect.drawTool.size}</label>
                    <input
                        type="range"
                        min="2" max="50"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    />
                    <span className="min-w-[40px]">{brushSize}px</span>
                </div>
            </div>

            <div className="flex-1 bg-[#dee2e6] rounded-xl overflow-hidden flex items-center justify-center">
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
                    className="bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] max-w-full max-h-full aspect-[4/3] touch-none border border-[#ddd] rounded-lg"
                    style={{ cursor: cursorStyle }}
                />
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: '10px' }}>
                <button
                    className="px-6 py-2.5 rounded-lg border border-[#dee2e6] bg-white cursor-pointer font-bold"
                    onClick={onCancel}
                >
                    {t.common.cancel}
                </button>
                <button
                    className="px-8 py-2.5 rounded-lg border-none bg-green-500 text-white cursor-pointer font-black text-base hover:bg-green-600"
                    onClick={handleDone}
                    style={{ backgroundColor: '#000000', color: '#ffffff', border: '1px solid #000' }}
                >
                    {t.kids.modelSelect.drawTool.done}
                </button>
            </div>
        </div>
    );
}
