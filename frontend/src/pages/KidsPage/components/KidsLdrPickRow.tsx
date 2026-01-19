import "./KidsLdrPickRow.css";

type LdrItem = { id: string; label: string; url: string; thumbnail?: string };

type Props = {
  items: LdrItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function KidsLdrPickRow({ items, selectedId, onSelect }: Props) {
  return (
    <div className="kidsLdrRow">
      <div className="kidsLdrRow__title">모델 선택</div>
      <div className="kidsLdrRow__sub">원하는 모델을 선택하면 자동으로 생성됩니다.</div>

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
                    No Preview
                  </div>
                )}
              </div>

              <div className="kidsLdrCard__footer">
                <div className="kidsLdrCard__label">{item.label}</div>
                <div className="kidsLdrCard__pick">
                  {isSelected ? "선택됨" : "선택"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
