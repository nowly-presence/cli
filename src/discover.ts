import { existsSync, readdirSync, readFileSync } from "fs"
import { join } from "path"

export interface PresenceMeta {
  slug: string
  letter: string
  dirName: string
  dir: string
  name: string
  version: string
  author: string
  authorGithub?: string
  category: string
  description: string
  descriptions: Record<string, string>
  metadata: Record<string, any>
}

const DEFAULT_SRC = "src"

export const getSrcDir = (cwd?: string): string =>
  join(cwd ?? process.cwd(), DEFAULT_SRC)

export const getDistDir = (cwd?: string): string =>
  join(cwd ?? process.cwd(), "dist")

export const getPresences = (cwd?: string): PresenceMeta[] => {
  const src = getSrcDir(cwd)
  if (!existsSync(src)) return []

  return readdirSync(src, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^[A-Z]$/.test(d.name))
    .flatMap((letterDir) =>
      readdirSync(join(src, letterDir.name), { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(src, letterDir.name, d.name, "metadata.json")))
        .map((d) => {
          const dir = join(src, letterDir.name, d.name)
          const meta = JSON.parse(readFileSync(join(dir, "metadata.json"), "utf-8"))
          return {
            slug: d.name.toLowerCase().replace(/\s+/g, "-"),
            letter: letterDir.name,
            dirName: d.name,
            dir,
            name: meta.name || d.name,
            version: meta.version || "0.0.0",
            author: meta.author?.name || "unknown",
            authorGithub: meta.author?.github,
            category: meta.category || "other",
            description: meta.description?.["en-US"] || Object.values(meta.description ?? {})[0] || "",
            descriptions: meta.description || {},
            metadata: meta,
          }
        }),
    )
}

export const getSlugFromName = (name: string): string =>
  name.toLowerCase().replace(/\s+/g, "-")

export const getLetterFromName = (name: string): string =>
  name.charAt(0).toUpperCase()

export const getPresenceBySlug = (slug: string, cwd?: string): PresenceMeta | undefined =>
  getPresences(cwd).find((p) => p.slug === slug)