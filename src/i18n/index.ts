import { zh } from "./zh";
import { en } from "./en";

export type Locale = "zh" | "en";

const messages = { zh, en } as const;
type Messages = typeof zh;
type NestedKeyOf<Obj, Prefix extends string = ""> =
    Obj extends Record<string, any>
        ? {
              [K in keyof Obj & string]: K extends string
                  ? Obj[K] extends string
                      ? `${Prefix}${K}`
                      : NestedKeyOf<Obj[K], `${Prefix}${K}.`>
                  : never;
          }[keyof Obj & string]
        : never;

type TranslationKey = NestedKeyOf<Messages>;

function getNested(obj: Record<string, any>, path: string): string {
    const keys = path.split(".");
    let current: any = obj;
    for (const k of keys) {
        if (current == null || typeof current !== "object") return path;
        current = current[k];
    }
    return typeof current === "string" ? current : path;
}

const STORAGE_KEY = "ibouncy-locale";

function detectLocale(): Locale {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === "zh" || stored === "en") return stored;
    } catch {
        /* localStorage unavailable */
    }
    if (typeof navigator !== "undefined" && navigator.language) {
        if (navigator.language.startsWith("zh")) return "zh";
    }
    return "en";
}

let currentLocale: Locale = detectLocale();

export function getLocale(): Locale {
    return currentLocale;
}

export function setLocale(locale: Locale): void {
    currentLocale = locale;
    try {
        localStorage.setItem(STORAGE_KEY, locale);
    } catch {
        /* localStorage unavailable */
    }
}

export function t(key: TranslationKey, ...args: (string | number)[]): string {
    let text = getNested(messages[currentLocale] as Record<string, any>, key);
    for (let i = 0; i < args.length; i++) {
        text = text.replace(`{${i}}`, String(args[i]));
    }
    return text;
}
