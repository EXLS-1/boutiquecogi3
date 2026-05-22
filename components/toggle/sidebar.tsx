"use client";

import { useEffect, useMemo, useState } from "react";

type Section = {
  id: string;
  label: string;
  icon?: string;
};

const SECTIONS: Section[] = [
  { id: "home", label: "ACCUEIL", icon: "🏠" },
 
  { id: "boutique", label: "BOUTIQUE", icon: "🛍" },
  { id: "femme", label: "Femme", icon: "🛍" },
  { id: "homme", label: "Homme", icon: "🛍" },
  { id: "enfant", label: "Enfant", icon: "🛍" },
  { id: "sac", label: "Sac", icon: "🛍" },
  { id: "chaussure", label: "Chaussure", icon: "🛍" },
  { id: "accessoire", label: "Accessoire", icon: "🛍" },
 
  { id: "contact", label: "CONTACT", icon: "✉️" },
  { id: "whatsapp", label: "WhatsApp", icon: "fab fa-whatsapp" },
  { id: "facebook", label: "Facebook", icon: "fab fa-facebook" },
  { id: "instagram", label: "Instagram", icon: "fab fa-instagram" },
  { id: "tiktok", label: "TikTok", icon: "fab fa-tiktok" },
];

export const Sidebar = () => {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  const sectionIds = useMemo(() => SECTIONS.map((s) => s.id), []);

  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Fallback si non supporté
    if (!("IntersectionObserver" in window)) {
      const onScroll = () => {
        const offset = window.scrollY + 150;

        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (!el) continue;

          const top = el.offsetTop;
          const bottom = top + el.offsetHeight;

          if (offset >= top && offset < bottom) {
            setActiveId((prev) => (prev !== id ? id : prev));
            break;
          }
        }
      };

      globalThis.addEventListener("scroll", onScroll, { passive: true });
      onScroll();

      return () => globalThis.removeEventListener("scroll", onScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        }

        if (best) {
          const id = best.target.id;
          setActiveId((prev) => (prev !== id ? id : prev));
        }
      },
      {
        root: null,
        rootMargin: "-120px 0px -60% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <aside
      className="sidebar"
      aria-label="Navigation principale"
    >
      <nav>
        <ul className="sidebar-menu">
          {SECTIONS.map((s) => {
            const isActive = activeId === s.id;

            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={isActive ? "active" : ""}
                  aria-current={isActive ? "true" : undefined}
                  onClick={(e) => {
                    if (prefersReducedMotion) return;

                    e.preventDefault();

                    const el = document.getElementById(s.id);
                    el?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  <span aria-hidden="true">{s.icon}</span>
                  <span className="sr-only">{s.label}</span>
                  <span aria-hidden="true">{s.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};