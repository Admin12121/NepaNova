"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ManualSection } from "@/config/manual";

interface PageNavProps {
  prev: ManualSection | null;
  next: ManualSection | null;
}

export function PageNav({ prev, next }: PageNavProps) {
  if (!prev && !next) return null;

  return (
    <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-stretch sm:justify-between">
      {prev ? (
        <Link
          href={`/manual/${prev.slug}`}
          className={cn(
            "group flex flex-1 items-center gap-3 rounded-lg border border-border p-4 transition-all duration-150",
            "hover:border-primary/30 hover:bg-muted/50"
          )}
        >
          <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-foreground" />
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Previous
            </span>
            <span className="text-sm font-semibold text-foreground">
              {prev.title}
            </span>
          </div>
        </Link>
      ) : (
        <div className="flex-1" />
      )}

      {next ? (
        <Link
          href={`/manual/${next.slug}`}
          className={cn(
            "group flex flex-1 items-center justify-end gap-3 rounded-lg border border-border p-4 transition-all duration-150",
            "hover:border-primary/30 hover:bg-muted/50"
          )}
        >
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Next
            </span>
            <span className="text-sm font-semibold text-foreground">
              {next.title}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
