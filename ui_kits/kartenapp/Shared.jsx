/* global React */
const { useState, useEffect, useRef } = React;

/* ----------------------------------------------------------------
   Lucide icon helper. Icons inherit color via `currentColor`, so
   set color on a wrapper; size via CSS .lucide or inline.
----------------------------------------------------------------- */
function Icon({ name, size = 22, strokeWidth = 2, style = {}, className = "" }) {
  return (
    <i
      data-lucide={name}
      className={"ic " + className}
      style={{ width: size, height: size, display: "inline-flex", "--sw": strokeWidth, ...style }}
    ></i>
  );
}
function useLucide(dep) {
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons({ attrs: { "stroke-width": 2 } });
  });
}

/* ---------------- Buttons ---------------- */
function Button({ variant = "primary", icon, iconRight, children, onClick, style }) {
  return (
    <button className={"btn btn-" + variant} onClick={onClick} style={style}>
      {icon && <Icon name={icon} size={19} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={19} />}
    </button>
  );
}

/* ---------------- Eyebrow / labels ---------------- */
function Eyebrow({ children, tone = "red", chip = false }) {
  const cls = "eyebrow eyebrow--" + tone + (chip ? " eyebrow--chip" : "");
  return <div className={cls}>{children}</div>;
}

/* ---------------- Status bar (faux iOS) ---------------- */
function StatusBar({ dark = false }) {
  return (
    <div className={"statusbar" + (dark ? " statusbar--dark" : "")}>
      <span className="sb-time">9:41</span>
      <span className="sb-right">
        <Icon name="signal" size={15} />
        <Icon name="wifi" size={15} />
        <Icon name="battery-full" size={17} />
      </span>
    </div>
  );
}

/* ---------------- Bottom navigation ---------------- */
function BottomNav({ active, onNav }) {
  const tabs = [
    { id: "map", icon: "map", label: "Karte" },
    { id: "tours", icon: "compass", label: "Touren" },
    { id: "info", icon: "info", label: "Info" },
  ];
  return (
    <nav className="bottomnav">
      {tabs.map((t) => (
        <button
          key={t.id}
          className={"navtab" + (active === t.id ? " on" : "")}
          onClick={() => onNav(t.id)}
        >
          <Icon name={t.icon} size={24} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ---------------- Top app bar ---------------- */
function TopBar({ title = "Ankunft: Gießen", trailing = "search", onMenu, onTrailing, dark = false }) {
  return (
    <header className={"topbar" + (dark ? " topbar--dark" : "")}>
      <button className="iconbtn" onClick={onMenu}><Icon name="menu" size={22} /></button>
      <span className="topbar-title">{title}</span>
      <button className="iconbtn" onClick={onTrailing}>
        {trailing && <Icon name={trailing} size={20} />}
      </button>
    </header>
  );
}

window.AGShared = { Icon, useLucide, Button, Eyebrow, StatusBar, BottomNav, TopBar };
Object.assign(window, { Icon, useLucide, Button, Eyebrow, StatusBar, BottomNav, TopBar });
