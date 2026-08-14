/** User row shape shared across auth handlers. */
export type UserRow = {
    id: unknown;
    email: string;
    username: string | null;
    nickname: string | null;
};

export type UserPayload = {
    id: number;
    email: string;
    username: string | null;
    nickname: string | null;
    displayName: string;
};

/** Normalize a DB user row into the public-safe payload returned to clients. */
export function toUserPayload(row: UserRow): UserPayload {
    const nickname = row.nickname ? String(row.nickname).trim() : "";
    const username = row.username ? String(row.username).trim() : "";
    const displayName = nickname || username || row.email;
    return {
        id: Number(row.id),
        email: row.email,
        username: username || null,
        nickname: nickname || null,
        displayName,
    };
}
