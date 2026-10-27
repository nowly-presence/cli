import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { loadPresenceLocales } from "@/locales";

const temporaryDirectories: string[] = [];

const createPresence = (files: Record<string, string>): string => {
  const root = mkdtempSync(join(tmpdir(), "nowly-cli-locales-"));
  temporaryDirectories.push(root);
  const locales = join(root, "locales");
  mkdirSync(locales);
  for (const [filename, contents] of Object.entries(files)) {
    writeFileSync(join(locales, filename), contents);
  }
  return root;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("loadPresenceLocales", () => {
  it("returns undefined when a presence has no locales directory", () => {
    const root = mkdtempSync(join(tmpdir(), "nowly-cli-locales-"));
    temporaryDirectories.push(root);

    expect(loadPresenceLocales(root)).toBeUndefined();
  });

  it("loads supported dictionaries with matching keys", () => {
    const root = createPresence({
      "en-US.json": JSON.stringify({ browsing: "Browsing" }),
      "fr-FR.json": JSON.stringify({ browsing: "Navigation" }),
    });

    expect(loadPresenceLocales(root)).toEqual({
      "en-US": { browsing: "Browsing" },
      "fr-FR": { browsing: "Navigation" },
    });
  });

  it("rejects a missing required English dictionary", () => {
    const root = createPresence({
      "fr-FR.json": JSON.stringify({ browsing: "Navigation" }),
    });

    expect(() => loadPresenceLocales(root)).toThrow(
      "Missing locales/en-US.json",
    );
  });

  it("rejects invalid dictionary values and mismatched translations", () => {
    const invalidValues = createPresence({
      "en-US.json": JSON.stringify({ browsing: 1 }),
    });
    expect(() => loadPresenceLocales(invalidValues)).toThrow(
      "must only contain string values",
    );

    const mismatchedKeys = createPresence({
      "en-US.json": JSON.stringify({ browsing: "Browsing" }),
      "fr-FR.json": JSON.stringify({ watching: "Regarder" }),
    });
    expect(() => loadPresenceLocales(mismatchedKeys)).toThrow(
      "missing: browsing; extra: watching",
    );
  });
});
