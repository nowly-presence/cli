import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getDistDir,
  getLetterFromName,
  getPresenceBySlug,
  getPresences,
  getSlugFromName,
  getSrcDir,
} from "@/discover";

const temporaryDirectories: string[] = [];

const createWorkspace = (): string => {
  const root = mkdtempSync(join(tmpdir(), "nowly-cli-discover-"));
  temporaryDirectories.push(root);
  return root;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("presence discovery", () => {
  it("derives source and distribution paths for a workspace and nested presence package", () => {
    const root = createWorkspace();
    mkdirSync(join(root, "src"));
    const nestedRoot = createWorkspace();
    mkdirSync(join(nestedRoot, "packages", "presences", "src"), {
      recursive: true,
    });

    expect(getSrcDir(root)).toBe(join(root, "src"));
    expect(getDistDir(root)).toBe(join(root, "dist"));
    expect(getSrcDir(nestedRoot)).toBe(
      join(nestedRoot, "packages", "presences", "src"),
    );
    expect(getDistDir(nestedRoot)).toBe(
      join(nestedRoot, "packages", "presences", "dist"),
    );
  });

  it("maps names to slugs and letters", () => {
    expect(getSlugFromName("Example Site Name")).toBe("example-site-name");
    expect(getLetterFromName("example")).toBe("E");
    expect(getLetterFromName("")).toBe("");
  });

  it("discovers metadata-bearing presence directories and looks them up by slug", () => {
    const root = createWorkspace();
    const presence = join(root, "src", "E", "Example Site");
    mkdirSync(presence, { recursive: true });
    writeFileSync(
      join(presence, "metadata.json"),
      JSON.stringify({
        name: "Example Site",
        version: "1.2.3",
        author: { name: "Alex", github: "alex" },
        category: "tools",
        description: { "en-US": "An example" },
      }),
    );
    mkdirSync(join(root, "src", "invalid"), { recursive: true });
    mkdirSync(join(root, "src", "E", "Missing Metadata"), { recursive: true });

    expect(getPresences(root)).toEqual([
      {
        slug: "example-site",
        letter: "E",
        dirName: "Example Site",
        dir: presence,
        name: "Example Site",
        version: "1.2.3",
        author: "Alex",
        authorGithub: "alex",
        category: "tools",
        description: "An example",
        descriptions: { "en-US": "An example" },
        metadata: {
          name: "Example Site",
          version: "1.2.3",
          author: { name: "Alex", github: "alex" },
          category: "tools",
          description: { "en-US": "An example" },
        },
      },
    ]);
    expect(getPresenceBySlug("example-site", root)?.dir).toBe(presence);
    expect(getPresenceBySlug("unknown", root)).toBeUndefined();
    expect(getPresences(join(root, "missing"))).toEqual([]);
  });
});
