'use client';

interface LDrawLoadingIndicatorProps {
    loaded: number;
    total: number;
    label?: string;
}

export default function LDrawLoadingIndicator({ loaded, total, label }: LDrawLoadingIndicatorProps) {
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-none">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
            {total > 0 ? (
                <>
                    <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div
                            className="h-full bg-black rounded-full transition-all duration-150"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <p className="font-bold text-gray-600 text-sm">
                        {loaded} / {total} parts ({percent}%)
                    </p>
                </>
            ) : (
                <p className="font-bold text-gray-600 text-sm">{label || 'Loading...'}</p>
            )}
        </div>
    );
}
