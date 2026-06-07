"use client";

import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const CONSENT_COOKIE = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365;

const Cookies = () => {
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getCookie = () => {
      const cookies = document.cookie.split("; ");
      const consentCookie = cookies.find((row) =>
        row.startsWith(`${CONSENT_COOKIE}=`)
      );
      const legacyAcceptCookie = cookies.find((row) => row.startsWith("accept="));
      return consentCookie?.split("=")[1] || legacyAcceptCookie?.split("=")[1] || null;
    };

    const cookieValue = getCookie();
    setVisible(cookieValue !== "accepted" && cookieValue !== "true");
    setIsLoading(false);
  }, []);

  const acceptCookies = () => {
    document.cookie = `${CONSENT_COOKIE}=accepted; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax`;
    setVisible(false);
  };

  const rejectCookies = () => {
    setVisible(false);
  };

  if (isLoading || !visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-[500] flex justify-center text-sm text-neutral-700 transition duration-500 dark:text-neutral-300 md:bottom-4 md:justify-start">
      <div className="w-full max-w-[34rem] rounded-2xl border border-neutral-200/80 bg-white/95 p-2 shadow-lg backdrop-blur-sm animate-fadeIn dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 rounded-full bg-neutral-100 p-1.5 dark:bg-neutral-800">
            <Cookie size={20} className="dark:stroke-white" />
            </span>
            <p className="leading-5">
              We only store a consent cookie when you accept optional cookies.
            </p>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              className="h-9 flex-1 rounded-lg dark:border-neutral-700 sm:flex-none"
              onClick={rejectCookies}
              variant="outline"
              size="sm"
            >
              Reject
            </Button>
            <Button
              className="h-9 flex-1 rounded-lg shadow-sm sm:flex-none"
              size="sm"
              onClick={acceptCookies}
            >
              Accept
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cookies;
