import { useEffect, useState } from "react";
import "./MyPageModal.css";
import { getMyOverview, retryJob } from "../../../api/myApi";
import type { MyOverview, MyJob } from "../../../api/myApi";
import { useNavigate } from "react-router-dom";
import MyPageProfile from "./MyPageProfile";
import MyPageGrid from "./MyPageGrid";

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function MyPageModal({ open, onClose }: Props) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<MyOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [retrying, setRetrying] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;

        setLoading(true);
        setError(null);

        getMyOverview()
            .then((res) => {
                setData(res);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message);
                setLoading(false);
            });
    }, [open]);

    if (!open) return null;

    // 모든 작업 통합 및 정렬 (최신순)
    // 단, API에서 이미 정렬되어 오지만, 합치면서 순서가 섞일 수 있으므로 다시 정렬 권장하거나
    // data.jobs.recent가 이미 전체 목록일 수 있음. -> myApi 확인 결과 'recent'는 페이징된 전체 목록임.
    // 하지만 위에서 filter로 쪼갰으니 다시 합치지 말고 data.jobs.recent를 그대로 사용하되 필터링만 살짝.
    // 사용자는 "생성 중, 생성 완료만 뜨게 하고"라고 했으므로 resumable(실패/취소) 포함 여부는 선택.
    // 일단 전체 보여주는 게 탐색기 스타일에 맞음.

    // API가 page 단위로 주므로 data.jobs.recent를 바로 쓰면 됨 (최신순)
    const allJobs = data?.jobs.recent || [];

    const handleRetry = async (jobId: string) => {
        try {
            setRetrying(jobId);
            await retryJob(jobId);
            const updated = await getMyOverview();
            setData(updated);
        } catch (err) {
            alert("작업 재시도에 실패했습니다.");
        } finally {
            setRetrying(null);
        }
    };

    const handleCardClick = (job: MyJob) => {
        if (job.status === "DONE" && job.modelKey) {
            onClose();
            navigate(`/kids/steps?url=${encodeURIComponent(job.modelKey)}`);
        } else if (job.status === "RUNNING" || job.status === "QUEUED") {
            alert("아직 생성 중입니다. 잠시만 기다려 주세요.");
        } else if (job.status === "FAILED" || job.status === "CANCELED") {
            if (confirm("생성에 실패했거나 중단된 작업입니다. 다시 시도하시겠습니까?")) {
                handleRetry(job.id);
            }
        }
    };

    return (
        <div className="mypageModal__overlay" onClick={onClose}>
            <div className="mypageModal" onClick={(e) => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="mypageModal__header">
                    <h2 className="mypageModal__title">내 작업 목록</h2>
                    <button className="mypageModal__close" onClick={onClose}>✕</button>
                </div>

                {/* 컨텐츠 */}
                <div className="mypageModal__content">
                    {loading ? (
                        <div className="mypageModal__loading">로딩 중...</div>
                    ) : error ? (
                        <div className="mypageModal__error">
                            <p>로그인이 필요합니다.</p>
                            <button className="mypageModal__loginBtn" onClick={onClose}>
                                로그인하기
                            </button>
                        </div>
                    ) : data ? (
                        <>
                            {/* 프로필 섹션 */}
                            <MyPageProfile settings={data.settings} />

                            {/* 통합 그리드 (파일 탐색기 스타일) */}
                            <MyPageGrid jobs={allJobs} onJobClick={handleCardClick} />
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
