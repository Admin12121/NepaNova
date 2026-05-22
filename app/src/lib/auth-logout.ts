export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";
export const AUTH_LOGIN_REDIRECT = "/auth/login";

export type AuthLogoutReason = "expired" | "unauthorized";

export type AuthUnauthorizedEventDetail = {
  code?: string;
  message?: string;
  reason: AuthLogoutReason;
  status?: number;
};

type RequestHeaders =
  | Headers
  | Record<string, string | undefined>
  | string[][];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorPayload = (data: unknown) => {
  if (!isRecord(data)) {
    return null;
  }

  return isRecord(data.errors) ? data.errors : data;
};

export const getAuthErrorCode = (data: unknown) => {
  const payload = getErrorPayload(data);
  return typeof payload?.code === "string" ? payload.code : undefined;
};

export const getAuthErrorMessage = (data: unknown) => {
  const payload = getErrorPayload(data);
  return typeof payload?.detail === "string" ? payload.detail : undefined;
};

export const hasAuthorizationHeader = (headers?: RequestHeaders) => {
  if (!headers) {
    return false;
  }

  if (headers instanceof Headers) {
    return headers.has("authorization") || headers.has("Authorization");
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === "authorization");
  }

  return Object.keys(headers).some(
    (key) => key.toLowerCase() === "authorization",
  );
};

export const emitUnauthorizedEvent = (detail: AuthUnauthorizedEventDetail) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail }));
};

export const maybeEmitUnauthorizedFromResponse = async (
  response: Response,
  headers?: RequestHeaders,
) => {
  if (response.status !== 401 || !hasAuthorizationHeader(headers)) {
    return;
  }

  let data: unknown;

  try {
    data = await response.clone().json();
  } catch {
    data = undefined;
  }

  const code = getAuthErrorCode(data);

  emitUnauthorizedEvent({
    code,
    message: getAuthErrorMessage(data),
    reason: code === "token_not_valid" ? "expired" : "unauthorized",
    status: response.status,
  });
};
