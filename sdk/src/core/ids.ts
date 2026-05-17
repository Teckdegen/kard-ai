import { randomBytes, createHash } from "node:crypto";

export const newId = (prefix: string): string =>
  `${prefix}_${randomBytes(8).toString("hex")}`;

export const hashJson = (obj: unknown): string =>
  "0x" + createHash("sha256").update(stableStringify(obj)).digest("hex");

export const stableStringify = (obj: unknown): string => {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  const keys = Object.keys(obj as object).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify((obj as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
};

export const now = (): number => Math.floor(Date.now() / 1000);
