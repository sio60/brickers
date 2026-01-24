import type { MyJob } from "../../../api/myApi";
import "./MyPageModal.css"; // 스타일 공유

type Props = {
    jobs: MyJob[];
    onJobClick: (job: MyJob) => void;
};

export default function MyPageGrid({ jobs, onJobClick }: Props) {

    const getStatusIcon = (status: MyJob["status"]) => {
        switch (status) {
            case "QUEUED": return "⏳";
            case "RUNNING": return "🔄";
            case "DONE": return "✅";
            case "FAILED": return "❌";
            case "CANCELED": return "⏹️";
            default: return "❓";
        }
    };

    if (jobs.length === 0) {
        return (
            <div className="mypageModal__grid">
                <div className="mypageModal__empty">
                    작업 내역이 없습니다.
                </div>
            </div>
        );
    }

    return (
        <div className="mypageModal__grid">
            {jobs.map((job) => (
                <div
                    key={job.id}
                    className={`mypageModal__fileItem ${job.status.toLowerCase()}`}
                    onClick={() => onJobClick(job)}
                    title={job.title}
                >
                    {/* 썸네일 영역 */}
                    <div className="mypageModal__fileThumb">
                        <img
                            src={job.sourceImageUrl || job.previewImageUrl || "/placeholder.png"}
                            alt={job.title}
                        />
                        {/* 상태 아이콘 */}
                        <div className="mypageModal__fileStatusIcon">
                            {getStatusIcon(job.status)}
                        </div>
                        {/* 진행 중이면 로딩 표시 */}
                        {(job.status === "RUNNING" || job.status === "QUEUED") && (
                            <div className="mypageModal__fileLoadingOverlay">
                                <div className="mypageModal__progressDot" />
                            </div>
                        )}
                    </div>

                    {/* 파일 정보 */}
                    <div className="mypageModal__fileInfo">
                        <div className="mypageModal__fileTitle">{job.title}</div>
                        <div className="mypageModal__fileDate">
                            {new Date(job.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
