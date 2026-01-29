'use client';

import { useEffect, useState } from 'react';

type Brick = {
    id: number;
    left: number;
    top: number;
    size: number;
    rotation: number;
    duration: number;
    delay: number;
    color: string;
};

const BRICK_COLORS = [
    '#FF6B6B', // red
    '#4ECDC4', // teal
    '#FFE66D', // yellow
    '#95E1D3', // mint
    '#F38181', // coral
    '#AA96DA', // lavender
    '#74B9FF', // blue
    '#A29BFE', // purple
];

export default function BackgroundBricks() {
    const [bricks, setBricks] = useState<Brick[]>([]);

    useEffect(() => {
        // Generate random bricks on client side only
        const generated: Brick[] = [];
        for (let i = 0; i < 12; i++) {
            generated.push({
                id: i,
                left: Math.random() * 100,
                top: Math.random() * 100,
                size: 20 + Math.random() * 40,
                rotation: Math.random() * 360,
                duration: 15 + Math.random() * 20,
                delay: Math.random() * -20,
                color: BRICK_COLORS[Math.floor(Math.random() * BRICK_COLORS.length)],
            });
        }
        setBricks(generated);
    }, []);

    if (bricks.length === 0) return null;

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {bricks.map((brick) => (
                <div
                    key={brick.id}
                    className="absolute opacity-20"
                    style={{
                        left: `${brick.left}%`,
                        top: `${brick.top}%`,
                        width: brick.size,
                        height: brick.size * 0.6,
                        backgroundColor: brick.color,
                        borderRadius: '4px',
                        transform: `rotate(${brick.rotation}deg)`,
                        animation: `floatBrick ${brick.duration}s ease-in-out infinite`,
                        animationDelay: `${brick.delay}s`,
                    }}
                >
                    {/* Brick studs */}
                    <div className="absolute top-0 left-1/4 w-1/4 h-2 -translate-y-1/2 rounded-full"
                         style={{ backgroundColor: brick.color, filter: 'brightness(0.9)' }} />
                    <div className="absolute top-0 right-1/4 w-1/4 h-2 -translate-y-1/2 rounded-full"
                         style={{ backgroundColor: brick.color, filter: 'brightness(0.9)' }} />
                </div>
            ))}
        </div>
    );
}
