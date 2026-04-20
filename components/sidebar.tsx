"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "home", label: "ACCUEIL", icon: "🏠" },
  { id: "boutique", label: "BOUTIQUE", icon: "🛍" },
  { id: "contact", label: "CONTACT", icon: "✉️" },
];

export const Sidebar = () => {
  const [active, setActive] = useState("home");

  useEffect(() => {
    let raf = 0;

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const offset = window.scrollY + 150;
        document.querySelectorAll("section[id]").forEach((section) => {
          const el = section as HTMLElement;
          if (
            offset >= el.offsetTop &&
            offset < el.offsetTop + el.offsetHeight
          ) {
            setActive(el.id);
          }
        });
        raf = 0;
      });
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <aside className="sidebar" role="navigation">
      <ul className="sidebar-menu">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => scrollTo(s.id)}
              className={active === s.id ? "active" : ""}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
};