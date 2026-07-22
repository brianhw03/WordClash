export default function MenuCard({ icon, title, description, onClick }) {
  return (
    <div
      className="menu-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
    >
      <div className="menu-icon">{icon}</div>

      <div className="menu-title">{title}</div>

      <div className="menu-desc">{description}</div>
    </div>
  );
}
