import "./ModeTile.css";

type Props = {
  variant: "kids" | "adult";
  title?: string;
  subtitle?: string;
  logo?: string;
  onClick: () => void;
};

export default function ModeTile({ variant, title, subtitle, logo, onClick }: Props) {
  return (
    <button
      type="button"
      className={`modeTile modeTile--${variant}`}
      onClick={onClick}
      aria-label={title || "mode select"}
    >
      {/* Background is now global 3D */}

      <div className={`modeTile__content modeTile__content--${variant}`}>
        {logo ? (
          <img src={logo} alt={title} className="modeTile__logo" />
        ) : (
          <>
            <div className="modeTile__title">{title}</div>
            {subtitle && <div className="modeTile__subtitle">{subtitle}</div>}
          </>
        )}
      </div>
    </button>
  );
}
