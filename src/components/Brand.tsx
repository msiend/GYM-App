import { NavLink } from "react-router-dom";
export default function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="FORM home">
      <img src="/icon-192.png" width="40" height="40" alt="" />
      <span>FORM</span>
    </NavLink>
  );
}
