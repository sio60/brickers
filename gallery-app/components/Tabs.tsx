'use client';

type Tab = {
    id: string;
    label: string;
};

type Props = {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
};

export default function Tabs({ tabs, activeTab, onTabChange }: Props) {
    return (
        <div className="flex gap-6 border-b border-gray-200">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`pb-3 text-lg transition-all ${
                        activeTab === tab.id
                            ? 'tab-active text-black'
                            : 'tab-inactive'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
