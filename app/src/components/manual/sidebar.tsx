"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { manualNavigation } from "@/config/manual";
import {
  BookOpen,
  LayoutDashboard,
  Users,
  PackagePlus,
  FileText,
  ImagePlus,
  Layers,
  FolderTree,
  Warehouse,
  BadgePercent,
  ShoppingCart,
  CalendarCheck,
  Settings,
  GalleryHorizontalEnd,
  CalendarDays,
  Filter,
  MessageSquare,
  Eye,
  ChevronRight,
  X,
  Menu,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  LayoutDashboard,
  Users,
  PackagePlus,
  FileText,
  ImagePlus,
  Layers,
  FolderTree,
  Warehouse,
  BadgePercent,
  ShoppingCart,
  CalendarCheck,
  Settings,
  GalleryHorizontalEnd,
  CalendarDays,
  Filter,
  MessageSquare,
  Eye,
};

interface ManualSidebarProps {
  className?: string;
}

export function ManualSidebar({ className }: ManualSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const currentSlug =
    pathname.split("/manual/")[1] || pathname.endsWith("/manual")
      ? pathname.split("/manual/")[1] || "introduction"
      : "";

  const sidebarContent = (
    <nav className="flex flex-col gap-1 py-4">
      {manualNavigation.map((group) => (
        <div key={group.title} className="mb-4">
          <h4 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </h4>
          <div className="flex flex-col gap-0.5">
            {group.sections.map((section) => {
              const IconComponent = iconMap[section.icon] || BookOpen;
              const isActive = currentSlug === section.slug;

              return (
                <Link
                  key={section.slug}
                  href={`/manual/${section.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <IconComponent
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="truncate">{section.title}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-primary-foreground/70" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:hidden",
          mobileOpen && "hidden",
        )}
        aria-label="Open manual navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-background transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <h3 className="text-sm font-semibold text-foreground">
            Admin Manual
          </h3>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain">
          {sidebarContent}
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:block w-64 shrink-0 border-r border-border bg-background/50 sticky top-0 h-screen",
          className,
        )}
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Admin Manual
          </h3>
        </div>
        <div className="h-[calc(100vh-3.5rem)] overflow-y-auto overscroll-contain">
          {sidebarContent}
        </div>
      </aside>
    </>
  );
}
