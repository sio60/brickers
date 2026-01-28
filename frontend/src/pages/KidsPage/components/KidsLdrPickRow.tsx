import "./KidsLdrPickRow.css";
import { useLanguage } from "../../../contexts/LanguageContext";

type LdrItem = { id: string; label: string; url: string; thumbnail?: string };

type Props = {
  items: LdrItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function KidsLdrPickRow({ items, selectedId, onSelect }: Props) {
  const { t } = useLanguage();

  return (
    <div className="kidsLdrRow">
      <div className="kidsLdrRow__title">{t.kids.modelSelect.title}</div>
      <div className="kidsLdrRow__sub">{t.kids.modelSelect.autoGenSub}</div>

      <div className="kidsLdrRow__grid">
        {items.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <div
              key={item.id}
              className={`kidsLdrCard ${isSelected ? "isSelected" : ""}`}
              onClick={() => onSelect(item.id)}
            >
              <div className="kidsLdrCard__viewer">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.label}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#999" }}>
                    {t.common.noPreview}
                  </div>
                )}
              </div>

              <div className="kidsLdrCard__footer">
                <div className="kidsLdrCard__label">{item.label}</div>
                <div className="kidsLdrCard__pick">
                  {isSelected ? t.kids.modelSelect.picked : t.kids.modelSelect.pick}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
