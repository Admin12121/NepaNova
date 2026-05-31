"use client";
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/global/sidebar";
import { Links } from "./links";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { useAuthUser } from "@/hooks/use-auth-user";

interface ProvidersProps {
  children: React.ReactNode;
  collapsed?: string;
  layout?: string;
}

const Providers = ({ children, collapsed, layout }: ProvidersProps) => {
  const { permissions, role } = useAuthUser();
  const links = React.useMemo(() => {
    const canAccess = (permission?: string) =>
      !permission || role === "Admin" || permissions.includes(permission);

    return Links.map((link) => {
      const subLinks = link.subLinks?.filter((subLink) =>
        canAccess(subLink.requiredPermission),
      );
      return { ...link, subLinks };
    }).filter((link) => {
      if (!canAccess(link.requiredPermission)) {
        return Boolean(link.subLinks?.length);
      }
      if (link.subLinks && link.subLinks.length === 0) {
        return false;
      }
      return true;
    });
  }, [permissions, role]);

  return (
    <Sidebar layout={layout} collapsed={collapsed}>
      <SidebarContent container="!bg-transparent" links={links}>
        <SidebarHeader logo="/logo.png" label={siteConfig.name} />
      </SidebarContent>
      <main className="h-svh w-full">
        <div
          className={cn(
            "relative flex h-full flex-1 flex-col bg-white dark:bg-[#18181b]",
            " md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
            "rounded-xl overflow-y-auto",
          )}
        >
          {children}
        </div>
      </main>
    </Sidebar>
  );
};

export default Providers;
