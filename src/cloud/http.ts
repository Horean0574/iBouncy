export type ApiOk<T> = { ok: true } & T;
export type ApiErr = { ok: false; error: string };

import { t } from "../i18n";

export async function apiFetch<T>(input: string, init?: RequestInit & { json?: unknown }): Promise<ApiOk<T>> {
    const headers: Record<string, string> = {
        "X-Requested-With": "XMLHttpRequest",
        ...(init?.headers as Record<string, string> | undefined),
    };

    let body = init?.body;
    if (init && "json" in init) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(init.json ?? {});
    }

    const res = await fetch(input, {
        ...init,
        body,
        headers,
        credentials: "include",
    });

    const data = (await res.json().catch(() => null)) as ApiOk<T> | ApiErr | null;
    if (!data || typeof data !== "object") {
        throw new Error(t("http.networkError", res.status));
    }
    if (!("ok" in data) || data.ok !== true) {
        const errMsg = "error" in data && data.error ? data.error : t("http.requestFailed", res.status);
        throw new Error(errMsg);
    }
    return data as ApiOk<T>;
}
