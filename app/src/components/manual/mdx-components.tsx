import React from "react";
import { cn } from "@/lib/utils";
import { ManualImage } from "./manual-image";

function Callout({
  children,
  type = "info",
}: {
  children: React.ReactNode;
  type?: "info" | "warning" | "tip" | "important";
}) {
  const styles = {
    info: "border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300",
    warning:
      "border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-300",
    tip: "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300",
    important:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
  };

  const icons = {
    info: "💡",
    warning: "⚠️",
    tip: "✅",
    important: "❗",
  };

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-4 px-4 py-3 text-sm",
        styles[type],
      )}
    >
      <span className="mr-2">{icons[type]}</span>
      {children}
    </div>
  );
}

function createSlugifier() {
  const counts: Record<string, number> = {};

  return function slugify(text: React.ReactNode): string | undefined {
    if (typeof text === "string") {
      const base = text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]/g, "");

      if (!base) return undefined;

      if (counts[base] != null) {
        counts[base]++;
        return `${base}-${counts[base]}`;
      } else {
        counts[base] = 0;
        return base;
      }
    }
    return undefined;
  };
}

function createHeadingComponent(
  level: 1 | 2 | 3 | 4,
  slugify: (text: React.ReactNode) => string | undefined,
) {
  const Tag = `h${level}` as const;

  const classNames: Record<number, string> = {
    1: "mb-4 mt-2 scroll-mt-20 text-3xl font-bold tracking-tight text-foreground",
    2: "mb-3 mt-8 scroll-mt-20 border-b border-border pb-2 text-2xl font-semibold tracking-tight text-foreground",
    3: "mb-2 mt-6 scroll-mt-20 text-xl font-semibold tracking-tight text-foreground",
    4: "mb-2 mt-4 text-lg font-semibold tracking-tight text-foreground",
  };

  function HeadingComponent({
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) {
    const id = level <= 3 ? slugify(children) : undefined;
    return (
      <Tag id={id} className={classNames[level]} {...props}>
        {children}
      </Tag>
    );
  }

  HeadingComponent.displayName = `MdxH${level}`;
  return HeadingComponent;
}

function MdxP({
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className="mb-4 leading-7 text-foreground/90 [&:not(:first-child)]:mt-2"
      {...props}
    >
      {children}
    </p>
  );
}

function MdxUl({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className="my-4 ml-6 list-disc space-y-2 text-foreground/90 [&>li]:leading-7"
      {...props}
    >
      {children}
    </ul>
  );
}

function MdxOl({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) {
  return (
    <ol
      className="my-4 ml-6 list-decimal space-y-2 text-foreground/90 [&>li]:leading-7"
      {...props}
    >
      {children}
    </ol>
  );
}

function MdxLi({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className="leading-7" {...props}>
      {children}
    </li>
  );
}

function MdxBlockquote({
  children,
  ...props
}: React.HTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      className="my-4 rounded-r-lg border-l-4 border-primary/30 bg-muted/50 py-3 pl-4 pr-4 text-sm italic text-muted-foreground [&>p]:mb-0"
      {...props}
    >
      {children}
    </blockquote>
  );
}

function MdxTable({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="my-6 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm" {...props}>
        {children}
      </table>
    </div>
  );
}

function MdxThead({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className="border-b border-border bg-muted/60" {...props}>
      {children}
    </thead>
  );
}

function MdxTr({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className="border-b border-border last:border-0" {...props}>
      {children}
    </tr>
  );
}

function MdxTh({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      {...props}
    >
      {children}
    </th>
  );
}

function MdxTd({
  children,
  ...props
}: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className="px-4 py-2.5 text-foreground/90" {...props}>
      {children}
    </td>
  );
}

function MdxCode({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground"
      {...props}
    >
      {children}
    </code>
  );
}

function MdxPre({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className="my-4 overflow-x-auto rounded-lg border border-border bg-muted/70 p-4 text-sm"
      {...props}
    >
      {children}
    </pre>
  );
}

function MdxHr() {
  return <hr className="my-8 border-border" />;
}

function MdxA({
  children,
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
      {...props}
    >
      {children}
    </a>
  );
}

function MdxStrong({ children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  );
}

export function createMdxComponents() {
  const slugify = createSlugifier();

  return {
    h1: createHeadingComponent(1, slugify),
    h2: createHeadingComponent(2, slugify),
    h3: createHeadingComponent(3, slugify),
    h4: createHeadingComponent(4, slugify),
    p: MdxP,
    ul: MdxUl,
    ol: MdxOl,
    li: MdxLi,
    blockquote: MdxBlockquote,
    table: MdxTable,
    thead: MdxThead,
    tr: MdxTr,
    th: MdxTh,
    td: MdxTd,
    code: MdxCode,
    pre: MdxPre,
    hr: MdxHr,
    a: MdxA,
    strong: MdxStrong,
    ManualImage,
    Callout,
  };
}
