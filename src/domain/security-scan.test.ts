import { describe, expect, it } from "vitest";

const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /sk_live_[A-Za-z0-9]{16,}/,
  /ghp_[A-Za-z0-9]{36}/,
  /github_pat_[A-Za-z0-9_]{22,}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /glpat-[A-Za-z0-9_-]{20}/,
  /AIza[0-9A-Za-z_-]{35}/,
  /postgres:\/\/[^:\s/"']+:([^@\s/"']+)@/,
  /mysql:\/\/[^:\s/"']+:([^@\s/"']+)@/
];

const sources = import.meta.glob("../**/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("secret scan", () => {
  it("loads the source tree for scanning", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50);
  });
  it("finds no embedded credentials or cloud keys in the source tree", () => {
    const findings: string[] = [];
    for (const [path, content] of Object.entries(sources)) {
      for (const pattern of SECRET_PATTERNS) if (pattern.test(content)) findings.push(`${path}: ${pattern.source}`);
    }
    expect(findings).toEqual([]);
  });
});
