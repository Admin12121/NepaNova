"use client";
import { useSyncExternalStore } from "react";
import { ChevronRight, X } from "lucide-react";
import { useGetlayoutQuery } from "@/lib/store/Service/api";
import { useState } from "react";

function useOnlineStatus() {
  const subscribe = (callback: any) => {
    window.addEventListener("online", callback);
    window.addEventListener("offline", callback);
    return () => {
      window.removeEventListener("online", callback);
      window.removeEventListener("offline", callback);
    };
  };

  const getSnapshot = () => navigator.onLine;

  return useSyncExternalStore(subscribe, getSnapshot);
}

export default function SiteBanner() {
  const isOnline = useOnlineStatus();
  const { data: layoutData } = useGetlayoutQuery({ layoutslug: "home" });
  const [dismissed, setDismissed] = useState(false);

  const message = layoutData?.config?.messages?.message;
  const showMessage = message && !dismissed;

  return (
    <>
      <div className="page_ambientContainer__xFtyW utils_inert__sliHw">
        <div className="page_ambientLight___Dvmo utils_inert__sliHw">
          <div className="page_lightA__3_ZLn"></div>
          <div className="page_lightB__k6xoL"></div>
          <div className="page_lightC__9Yvpx"></div>
        </div>
      </div>
      {/* Promotional Message Banner */}
      {showMessage && (
        <div
          className="group relative top-0 bg-amber-600 py-2 text-white transition-all duration-300 md:py-0 w-full"
          style={{
            background:
              "linear-gradient(to right, rgb(209 153 73), rgb(177 125 56), rgb(82 71 53))",
          }}
        >
          <div className="container flex flex-col items-center justify-center gap-4 md:h-9 md:flex-row">
            <div className="inline-flex text-xs leading-normal md:text-sm">
              <span className="ml-1 font-[580] dark:font-[550]">{message}</span>
              <ChevronRight className="ml-1 mt-[3px] hidden size-4 transition-all duration-300 ease-out group-hover:translate-x-1 lg:inline-block" />
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <hr className="absolute bottom-0 m-0 h-px w-full bg-neutral-200/30" />
        </div>
      )}
      {/* Offline Status Banner */}
      {!isOnline && (
        <div
          className="group relative top-0 bg-red-600 py-2 text-white transition-all duration-300 md:py-0 w-full"
          style={{
            background: "linear-gradient(to right, #dc2626, #b91c1c, #991b1b)",
          }}
        >
          <div className="container flex flex-col items-center justify-center gap-4 md:h-9 md:flex-row">
            <div className="inline-flex text-xs leading-normal md:text-sm">
              <span className="ml-1 font-[580] dark:font-[550]">
                You are currently 🔴 Offline!
              </span>
            </div>
          </div>
          <hr className="absolute bottom-0 m-0 h-px w-full bg-neutral-200/30" />
        </div>
      )}
    </>
  );
}
