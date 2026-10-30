import { describe, expect, it } from "vitest";
import { getAliasIssues } from "@/aliases";

const presence = (slug: string, aliases?: unknown) => ({
  slug,
  metadata: aliases === undefined ? {} : { aliases },
});

describe("presence aliases", () => {
  it("accepts missing and valid unique aliases", () => {
    const openfront = presence("openfront.io", ["openfront", "open-front"]);
    const catalog = [openfront, presence("youtube", ["yt"])];

    expect(getAliasIssues(presence("youtube"), catalog)).toEqual([]);
    expect(getAliasIssues(openfront, catalog)).toEqual([]);
  });

  it("rejects malformed alias lists and entries", () => {
    expect(getAliasIssues(presence("example", "example-site"), [])).toEqual([
      "metadata.aliases must be an array of strings",
    ]);
    expect(
      getAliasIssues(presence("example", ["Example", "a b", "-x", 3]), []),
    ).toEqual([
      'Alias "Example" must use lowercase letters, digits, dots or hyphens (max 80 characters)',
      'Alias "a b" must use lowercase letters, digits, dots or hyphens (max 80 characters)',
      'Alias "-x" must use lowercase letters, digits, dots or hyphens (max 80 characters)',
      "metadata.aliases must only contain strings",
    ]);
    expect(
      getAliasIssues(
        presence(
          "example",
          Array.from({ length: 11 }, (_, index) => `alias-${index}`),
        ),
        [],
      ),
    ).toEqual(["metadata.aliases accepts at most 10 entries"]);
  });

  it("rejects aliases duplicating the presence slug or each other", () => {
    expect(
      getAliasIssues(presence("example", ["example", "ex", "ex"]), []),
    ).toEqual([
      'Alias "example" duplicates the presence slug',
      'Alias "ex" is listed more than once',
    ]);
  });

  it("rejects aliases and slugs already used by another presence", () => {
    const catalog = [
      presence("openfront.io", ["openfront"]),
      presence("youtube", ["yt"]),
      presence("openfront"),
    ];

    expect(
      getAliasIssues(presence("example", ["youtube", "yt"]), catalog),
    ).toEqual([
      'Alias "youtube" is already the slug of "youtube"',
      'Alias "yt" is already an alias of "youtube"',
    ]);
    expect(getAliasIssues(catalog[2], catalog)).toEqual([
      'Slug "openfront" is already an alias of "openfront.io"',
    ]);
  });
});
