import { useState } from "react";

const items = [
  { id: "home", label: "Home" },
  { id: "reports", label: "Explore issues" },
];

export default function Navbar({ activeView = "home", onNavigate = () => {}, isAdmin = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  function go(view) { onNavigate(view); setMenuOpen(false); }
  return (
    <header className="navbar cc-navbar">
      <div className="nav-inner cc-nav-inner">
        <button className="cc-brand" type="button" onClick={() => go("home")} aria-label="Community Connect home">
          <span className="cc-brand-mark" aria-hidden="true"><span>c</span><i /></span>
          <span className="cc-brand-words"><strong>community<span>connect</span></strong><small>NDENDERU WARD</small></span>
        </button>
        <button className="cc-menu-toggle" type="button" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "✕" : "☰"}</button>
        <nav className={`cc-nav-links ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          {items.map(item => <button key={item.id} type="button" className={activeView === item.id ? "is-active" : ""} onClick={() => go(item.id)}>{item.label}</button>)}
          {isAdmin && <button type="button" className={activeView === "admin" ? "is-active" : ""} onClick={() => go("admin")}>Admin dashboard</button>}
          <button type="button" className="cc-nav-cta" onClick={() => go("submit")}>Report an issue <span aria-hidden="true">↗</span></button>
        </nav>
      </div>
    </header>
  );
}
