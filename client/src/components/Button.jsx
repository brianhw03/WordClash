export default function Button({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="btn btn-primary w-100 btn-play"
    >
      {children}
    </button>
  );
}
