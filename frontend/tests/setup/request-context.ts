export interface TestRequestContext {
  cookie: string;
  extra: Record<string, string>;
}

function store(): TestRequestContext {
  const globalStore = globalThis as typeof globalThis & {
    __nervioTestContext?: TestRequestContext;
  };
  globalStore.__nervioTestContext ??= { cookie: "", extra: {} };
  return globalStore.__nervioTestContext;
}

export function setSessionCookie(cookieHeader: string) {
  store().cookie = cookieHeader;
}

export function setExtraHeaders(headers: Record<string, string>) {
  store().extra = headers;
}

export function clearRequestContext() {
  const current = store();
  current.cookie = "";
  current.extra = {};
}

export function getRequestHeaders(): Headers {
  const current = store();
  const headers = new Headers(current.extra);
  if (current.cookie) headers.set("cookie", current.cookie);
  return headers;
}

/** Convierte `Set-Cookie` en el header `Cookie` que espera getSession. */
export function cookieHeaderFromSetCookie(values: string[]): string {
  return values
    .map((entry) => entry.split(";")[0]?.trim())
    .filter((part): part is string => Boolean(part) && part.includes("="))
    .join("; ");
}
