import type { MyOverview } from "../../../api/myApi";
import { useLanguage } from "../../../contexts/LanguageContext";

type Props = {
    settings: MyOverview["settings"];
};

export default function MyPageProfile({ settings }: Props) {
    const { t } = useLanguage();

    return (
        <div className="mypageModal__profile">
            <img
                src={settings.profileImage || "/default-avatar.png"}
                alt={t.profile.imageAlt}
                className="mypageModal__avatar"
            />
            <div className="mypageModal__info">
                <div className="mypageModal__nickname">{settings.nickname || t.profile.defaultNickname}</div>
                <div className="mypageModal__email">{settings.email}</div>
                <div className="mypageModal__plan">{settings.membershipPlan}</div>
            </div>
        </div>
    );
}
