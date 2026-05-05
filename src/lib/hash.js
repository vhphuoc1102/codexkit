import { createHash } from "node:crypto";

export function sha256(input) {
  const normalized = typeof input === "string" ? input.replace(/\r\n/g, "\n") : input;
  return createHash("sha256").update(normalized).digest("hex");
}
