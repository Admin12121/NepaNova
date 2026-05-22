"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import type { AppDispatch } from "@/lib/store/store";
import { userAuthapi } from "@/lib/store/Service/api";
import {
  AUTH_LOGIN_REDIRECT,
  AUTH_UNAUTHORIZED_EVENT,
  type AuthUnauthorizedEventDetail,
} from "@/lib/auth-logout";

const SESSION_TOAST_ID = "auth-session-ended";

const getSessionExpiryTime = (expires?: string | Date) => {
  if (!expires) {
    return null;
  }

  const parsedExpiry =
    expires instanceof Date ? expires.getTime() : Date.parse(expires);

  return Number.isNaN(parsedExpiry) ? null : parsedExpiry;
};

export const AuthSessionGuard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data: session, status } = useSession();
  const logoutInProgressRef = useRef(false);

  const forceLogout = useEffectEvent(
    async (detail: AuthUnauthorizedEventDetail) => {
      if (logoutInProgressRef.current || !session?.accessToken) {
        return;
      }

      logoutInProgressRef.current = true;
      dispatch(userAuthapi.util.resetApiState());

      toast.error(
        detail.reason === "expired"
          ? "Your session has expired. Please sign in again."
          : "You are no longer authorized. Please sign in again.",
        { id: SESSION_TOAST_ID },
      );

      await signOut({ redirectTo: AUTH_LOGIN_REDIRECT });
    },
  );

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) {
      logoutInProgressRef.current = false;
    }
  }, [session?.accessToken, status]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<AuthUnauthorizedEventDetail>;
      void forceLogout(customEvent.detail);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken) {
      return;
    }

    const expiryTime = getSessionExpiryTime(session.expires);

    if (!expiryTime) {
      return;
    }

    const timeoutMs = expiryTime - Date.now();

    if (timeoutMs <= 0) {
      void forceLogout({ reason: "expired" });
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void forceLogout({ reason: "expired" });
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [forceLogout, session?.accessToken, session?.expires, status]);

  return null;
};
