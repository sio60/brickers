import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAdminAI } from "@/hooks/useAdminAI";
import { renderMarkdown } from "@/lib/markdownUtils";

const AdminAIReport: React.FC<{ activeTab: string }> = ({ activeTab }) => {
    const { t } = useLanguage();
    const {
        deepAnalyzing,
        deepReport,
        deepRisk,
        deepError,
        deepAnomalies,
        deepActions,
        deepDiagnosis,
        lastDeepAnalysisTime,
        handleDeepAnalyze
    } = useAdminAI(activeTab);

    if (activeTab !== "dashboard") return null;

    return (
        <div style={{
            marginTop: '32px',
            padding: '28px',
            background: '#f8f9fa',
            borderRadius: '20px',
            border: '2px solid #eee',
        }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>AI 심층 분석</h3>
                        {lastDeepAnalysisTime && (
                            <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 500 }}>
                                ({lastDeepAnalysisTime} 갱신됨)
                            </span>
                        )}
                    </div>
                    <p style={{ fontSize: '12px', color: '#999', margin: '4px 0 0' }}>
                        GA4 수집 → 이상 탐지 → 원인 추론 → 전략 수립 (5분 주기 자동 갱신)
                    </p>
                </div>
                <button
                    onClick={handleDeepAnalyze}
                    disabled={deepAnalyzing}
                    style={{
                        padding: '10px 24px',
                        background: deepAnalyzing ? '#ccc' : '#000',
                        color: deepAnalyzing ? '#888' : '#ffe135',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: deepAnalyzing ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                    }}
                >
                    {deepAnalyzing ? '분석 중...' : '심층 분석 실행'}
                </button>
            </div>

            {/* 로딩 */}
            {deepAnalyzing && (
                <div style={{
                    padding: '48px 20px',
                    textAlign: 'center',
                    background: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #eee',
                    marginTop: '16px',
                }}>
                    <div style={{
                        width: '40px', height: '40px', margin: '0 auto 16px',
                        border: '4px solid #f3f3f3', borderTop: '4px solid #000',
                        borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ fontSize: '14px', color: '#666', fontWeight: 700 }}>AI 전문가가 지표를 분석하고 있습니다...</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* 에러 */}
            {deepError && (
                <div style={{ padding: '20px', color: '#e53e3e', background: '#fff5f5', borderRadius: '12px', marginTop: '16px' }}>
                    ⚠️ {deepError}
                </div>
            )}

            {/* 리포트 결과 */}
            {!deepAnalyzing && deepReport && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* 상단 요약 카드들 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div style={{ padding: '16px', background: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
                            <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>RISK SCORE</div>
                            <div style={{ fontSize: '24px', fontWeight: 900, color: deepRisk > 0.6 ? '#e53e3e' : '#000' }}>
                                {(deepRisk * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div style={{ padding: '16px', background: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
                            <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>ANOMALIES</div>
                            <div style={{ fontSize: '24px', fontWeight: 900 }}>{deepAnomalies.length}건</div>
                        </div>
                    </div>

                    {/* 메인 리포트 텍스트 */}
                    <div style={{
                        padding: '24px',
                        background: '#fff',
                        borderRadius: '16px',
                        border: '1px solid #eee',
                        lineHeight: 1.6,
                        color: '#333'
                    }}>
                        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(deepReport) }} />
                    </div>

                    {/* 제안된 조치사항 (있을 경우) */}
                    {deepActions.length > 0 && (
                        <div style={{ padding: '20px', background: '#fff', borderRadius: '16px', border: '1px solid #eee' }}>
                            <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800 }}>⚡ 권장 대응 전략</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {deepActions.map((a, idx) => (
                                    <div key={idx} style={{ padding: '12px', background: '#f8f9fa', borderRadius: '8px', fontSize: '13px' }}>
                                        <span style={{ fontWeight: 800, color: '#000' }}>[{a.priority}] {a.action}</span>
                                        <div style={{ color: '#666', marginTop: '4px', fontSize: '12px' }}>효과: {a.expected_impact} | 리스크: {a.risk}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminAIReport;
