import "./ModeTile.css";

type Props = {
  variant: "kids" | "adult";
  title: string;
  subtitle?: string;
  bgImage: string;
  onClick: () => void;
};

export default function ModeTile({ variant, title, subtitle, bgImage, onClick }: Props) {
  return (
    <button
      type="button"
      className={`modeTile modeTile--${variant}`}
      onClick={onClick}
      aria-label={title}
    >
      <div className="modeTile__bg" style={{ backgroundImage: `url(${bgImage})` }} />
      <div className="modeTile__overlay" />

      <div className={`modeTile__content modeTile__content--${variant}`}>
        <div className="modeTile__title">{title}</div>
        {subtitle && <div className="modeTile__subtitle">{subtitle}</div>}
      </div>
    </button>
  );
}
