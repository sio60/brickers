import type { MyOverview } from "../../../api/myApi";

type Props = {
    settings: MyOverview["settings"];
};

export default function MyPageProfile({ settings }: Props) {
    return (
        <div className="mypageModal__profile">
            <img
                src={settings.profileImage || "/default-avatar.png"}
                alt="프로필"
                className="mypageModal__avatar"
            />
            <div className="mypageModal__info">
                <div className="mypageModal__nickname">{settings.nickname || "사용자"}</div>
                <div className="mypageModal__email">{settings.email}</div>
                <div className="mypageModal__plan">{settings.membershipPlan}</div>
            </div>
        </div>
    );
}
