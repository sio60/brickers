'use client';

type Props = {
    onClick?: () => void;
    href?: string;
    label?: string;
};

export default function NextButton({ onClick, href, label = 'Next' }: Props) {
    const className = "btn-primary px-6 py-3 rounded-full flex items-center gap-2 font-semibold";

    const content = (
        <>
            {label}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
        </>
    );

    // Use <a> for external navigation (to trigger browser navigation, not SPA)
    if (href) {
        return (
            <a href={href} className={className}>
                {content}
            </a>
        );
    }

    return (
        <button onClick={onClick} className={className}>
            {content}
        </button>
    );
}
