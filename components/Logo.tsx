import { PlaneIcon } from "./icons";

export default function Logo() {
  return (
    <div className="brand">
      <PlaneIcon size={28} className="brand__icon" style={{ transform: "rotate(45deg)" }} />
      <span className="brand__name">Flights Near Home</span>
    </div>
  );
}
