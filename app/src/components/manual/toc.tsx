"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

function extractHeadings(content: string): TocItem[] {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const items: TocItem[] = [];
  const idCounts: Record<string, number> = {};
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    let id = text
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

    if (id && text) {
      if (idCounts[id] != null) {
        idCounts[id]++;
        id = `${id}-${idCounts[id]}`;
      } else {
        idCounts[id] = 0;
      }
      items.push({ id, text, level });
    }
  }

  return items;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = extractHeadings(content);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    const ids = headings.map((h) => h.id);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            const aIndex = ids.indexOf(a.target.id);
            const bIndex = ids.indexOf(b.target.id);
            return aIndex - bIndex;
          });

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0.1,
      },
    );

    const elements: Element[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        observer.observe(el);
        elements.push(el);
      }
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [headings]);

  if (headings.length < 2) return null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
      window.history.replaceState(null, "", `#${id}`);
    }
  };

  return (
    <div className="hidden xl:flex xl:flex-col w-56 shrink-0 h-full overflow-hidden">
      <div className="flex items-center gap-2 py-4 px-1 shrink-0">
        <List className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          On This Page
        </h4>
      </div>
      <nav className="flex flex-col gap-0.5 border-l border-border overflow-y-auto overscroll-contain flex-1 pb-8">
        {headings.map((item, index) => (
          <a
            key={`${item.id}-${index}`}
            href={`#${item.id}`}
            onClick={(e) => handleClick(e, item.id)}
            className={cn(
              "block border-l-2 py-1 text-[13px] leading-snug transition-all duration-150",
              item.level === 1 && "pl-3 -ml-[2px] font-medium",
              item.level === 2 && "pl-5 -ml-[2px]",
              item.level === 3 && "pl-7 -ml-[2px] text-[12px]",
              activeId === item.id
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50",
            )}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
