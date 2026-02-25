'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Paintbrush, Eraser, PaintBucket, Trash2 } from 'lucide-react'; // 아이콘 추가

type ToolType = 'brush' | 'eraser' | 'fill';

function buildCursor(tool: ToolType, size: number, color: string): string {
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
    } else if (tool === 'fill') {
        // 양동이 커서는 기본 커서를 사용하거나 커스텀 페인트 통 모양을 사용할 수 있습니다.
        // 현재는 좌상단을 클릭 기준으로 삼는 작은 페인트통 아이콘입니다.
        svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='${color.replace('#', '%23')}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z'/><path d='m5 2 5 5'/><path d='M2 13h15'/><path d='M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z'/></svg>`;
        return `url("data:image/svg+xml,${svg}") 2 20, crosshair`;
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
    const [tool, setTool] = useState<ToolType>('brush');

    const cursorStyle = useMemo(() => buildCursor(tool, brushSize, color), [tool, brushSize, color]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 초기 배경 흰색으로 채우기
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b, 255];
    };

    const floodFill = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;

        const targetColor = [
            data[(startY * width + startX) * 4],
            data[(startY * width + startX) * 4 + 1],
            data[(startY * width + startX) * 4 + 2],
            data[(startY * width + startX) * 4 + 3]
        ];

        const fillRgba = hexToRgb(fillColor);

        // 이미 같은 색상이면 무시
        if (targetColor[0] === fillRgba[0] && targetColor[1] === fillRgba[1] &&
            targetColor[2] === fillRgba[2] && targetColor[3] === fillRgba[3]) {
            return;
        }

        const matchStartColor = (pixelPos: number) => {
            const r = data[pixelPos];
            const g = data[pixelPos + 1];
            const b = data[pixelPos + 2];
            const a = data[pixelPos + 3];

            // 여유 오차(Tolerance) 적용하여 안티앨리어싱 선의 부드러운 경계 지원
            return Math.abs(r - targetColor[0]) <= 30 &&
                Math.abs(g - targetColor[1]) <= 30 &&
                Math.abs(b - targetColor[2]) <= 30 &&
                Math.abs(a - targetColor[3]) <= 30;
        };

        const colorPixel = (pixelPos: number) => {
            data[pixelPos] = fillRgba[0];
            data[pixelPos + 1] = fillRgba[1];
            data[pixelPos + 2] = fillRgba[2];
            data[pixelPos + 3] = 255;
        };

        const pixelStack = [[startX, startY]];

        while (pixelStack.length > 0) {
            const newPos = pixelStack.pop() as [number, number];
            const x = newPos[0];
            let y = newPos[1];
            let pixelPos = (y * width + x) * 4;

            while (y-- >= 0 && matchStartColor(pixelPos)) {
                pixelPos -= width * 4;
            }
            pixelPos += width * 4;
            ++y;

            let reachLeft = false;
            let reachRight = false;

            while (y++ < height - 1 && matchStartColor(pixelPos)) {
                colorPixel(pixelPos);

                if (x > 0) {
                    if (matchStartColor(pixelPos - 4)) {
                        if (!reachLeft) {
                            pixelStack.push([x - 1, y]);
                            reachLeft = true;
                        }
                    } else if (reachLeft) {
                        reachLeft = false;
                    }
                }

                if (x < width - 1) {
                    if (matchStartColor(pixelPos + 4)) {
                        if (!reachRight) {
                            pixelStack.push([x + 1, y]);
                            reachRight = true;
                        }
                    } else if (reachRight) {
                        reachRight = false;
                    }
                }
                pixelPos += width * 4;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: Math.floor((clientX - rect.left) * scaleX),
            y: Math.floor((clientY - rect.top) * scaleY)
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const { x, y } = getPos(e);

        if (tool === 'fill') {
            floodFill(canvas, ctx, x, y, color);
            return;
        }

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

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || tool === 'fill') return;
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
            <div className="flex flex-wrap items-center justify-between p-3 bg-[#f1f3f5] rounded-xl">
                <div className="flex gap-2">
                    <button
                        title="브러시"
                        className={`p-2 rounded-lg border cursor-pointer flex items-center justify-center transition-colors ${tool === 'brush' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white border-[#dee2e6] text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setTool('brush')}
                    >
                        <Paintbrush size={20} strokeWidth={2.5} />
                    </button>
                    <button
                        title="지우개"
                        className={`p-2 rounded-lg border cursor-pointer flex items-center justify-center transition-colors ${tool === 'eraser' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white border-[#dee2e6] text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setTool('eraser')}
                    >
                        <Eraser size={20} strokeWidth={2.5} />
                    </button>
                    <button
                        title="채우기 (양동이)"
                        className={`p-2 rounded-lg border cursor-pointer flex items-center justify-center transition-colors ${tool === 'fill' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white border-[#dee2e6] text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setTool('fill')}
                    >
                        <PaintBucket size={20} strokeWidth={2.5} />
                    </button>

                    <div className="w-px h-8 bg-[#dee2e6] mx-1" />

                    <button
                        title="전체 지우기"
                        className="p-2 rounded-lg border border-[#dee2e6] bg-white cursor-pointer flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                        onClick={handleClear}
                    >
                        <Trash2 size={20} strokeWidth={2.5} />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-1.5 flex-wrap">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                title={c}
                                className={`w-7 h-7 rounded-full border-2 border-white cursor-pointer p-0 transition-transform hover:scale-110 ${color === c && (tool === 'brush' || tool === 'fill') ? 'shadow-[0_0_0_2px_#3b82f6] scale-110' : 'shadow-[0_0_0_1px_#dee2e6]'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                    setColor(c);
                                    if (tool === 'eraser') setTool('brush'); // 지우개 상태였다면 브러시로 변경
                                }}
                            />
                        ))}
                    </div>

                    <div className="w-px h-8 bg-[#dee2e6]" />

                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-white px-3 py-1.5 border border-[#dee2e6] rounded-lg">
                        <label>크기</label>
                        <input
                            type="range"
                            min="2" max="50"
                            value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-24 accent-blue-500"
                        />
                        <span className="min-w-[40px] text-right">{brushSize}px</span>
                    </div>
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
                    className="px-6 py-2.5 rounded-lg border border-[#dee2e6] bg-white text-gray-600 cursor-pointer font-bold hover:bg-gray-50 transition-colors"
                    onClick={onCancel}
                >
                    {t.common.cancel}
                </button>
                <button
                    className="px-8 py-2.5 rounded-lg border-none text-white cursor-pointer font-black text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    onClick={handleDone}
                    style={{ backgroundColor: '#000000', color: '#ffffff', border: '1px solid #000' }}
                >
                    {t.kids.modelSelect.drawTool.done}
                </button>
            </div>
        </div>
    );
}
