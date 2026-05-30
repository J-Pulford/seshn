"use client";

import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

// Scroll-reveal: fades/translates children in when they enter the viewport
// (mirrors the prototype's IntersectionObserver + .reveal/.in pattern).
export default function Reveal({
  children,
  as: Tag = "div",
  className = "",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal${shown ? " in" : ""}${className ? " " + className : ""}`} style={style}>
      {children}
    </Tag>
  );
}
