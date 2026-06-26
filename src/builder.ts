import { getDistDir, type PresenceMeta } from "@/discover"
import { createRequire } from "module"
import esbuild from "esbuild"
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

const _require = createRequire(import.meta.url)
const sdkEntry = _require.resolve("@nowly/sdk")
const sdkSrc = join(sdkEntry, "..")

const nowlyPresencePlugin: esbuild.Plugin = {
  name: "nowly-presence",
  setup: (build) => {
    build.onResolve({ filter: /^@nowly\/presence$/ }, () => ({
      path: sdkEntry,
    }))
    build.onResolve({ filter: /^@\// }, (args) => {
      const resolved = join(sdkSrc, args.path.slice(2))
      return { path: resolved + ".ts" }
    })
  },
}

export const buildPresence = async (p: PresenceMeta, cwd?: string): Promise<string | null> => {
  const presenceTsPath = join(p.dir, "presence.ts")
  if (!existsSync(presenceTsPath)) return null

  const distDir = join(getDistDir(cwd), "presences", p.slug)
  mkdirSync(distDir, { recursive: true })

  const bundlePath = join(distDir, "bundle.js")

  const result = await esbuild.build({
    entryPoints: [presenceTsPath],
    bundle: true,
    format: "iife",
    globalName: "__PRESENCE__",
    outfile: bundlePath,
    minify: true,
    legalComments: "none",
    target: "es2022",
    platform: "browser",
    plugins: [nowlyPresencePlugin],
    write: true,
  })

  if (result.errors.length > 0) return null

  const bundle = readFileSync(bundlePath, "utf-8")

  const source = readFileSync(presenceTsPath, "utf-8")
  const settings = extractSettings(source)
  if (settings) {
    writeFileSync(join(distDir, "settings.json"), JSON.stringify(settings, null, 2))
  }

  writeFileSync(join(distDir, "metadata.json"), JSON.stringify(p.metadata, null, 2))

  const assetsDir = join(p.dir, "assets")
  if (existsSync(assetsDir)) {
    const distAssets = join(distDir, "assets")
    mkdirSync(distAssets, { recursive: true })
    cpSync(assetsDir, distAssets, { recursive: true })
  }

  return bundle
}

export const buildAllPresences = async (presences: PresenceMeta[], cwd?: string): Promise<void> => {
  mkdirSync(join(getDistDir(cwd), "presences"), { recursive: true })
  const registry: any[] = []

  for (const p of presences) {
    const bundle = await buildPresence(p, cwd)
    if (bundle) {
      const settings = extractSettingsFromFile(p.dir)
      registry.push({ ...p.metadata, slug: p.slug, settings })
    }
  }

  writeFileSync(join(getDistDir(cwd), "registry.json"), JSON.stringify(registry, null, 2))
}

const extractSettingsFromFile = (dir: string): any | null => {
  const tsPath = join(dir, "presence.ts")
  if (!existsSync(tsPath)) return null
  const source = readFileSync(tsPath, "utf-8")
  return extractSettings(source)
}

const extractSettings = (source: string): any | null => {
  const fnMatch = source.match(/(?:new\s+)?Presence\.Settings\s*\(/)
  if (!fnMatch) return null

  const startParen = fnMatch.index! + fnMatch[0].length
  let depth = 1
  let i = startParen
  let inStr = false
  let quote: string | null = null
  let isEsc = false

  while (i < source.length && depth > 0) {
    const c = source[i]

    if (isEsc) {
      isEsc = false
    } else if (inStr) {
      if (c === "\\") isEsc = true
      else if (c === quote) inStr = false
    } else {
      if (c === "\"" || c === "'" || c === "`") {
        inStr = true
        quote = c
      } else if (c === "(") {
        depth++
      } else if (c === ")") {
        depth--
      }
    }

    i++
  }

  if (depth !== 0) return null

  const objStr = source.slice(startParen, i - 1)

  try {
    const fn = new Function(`return (${objStr})`)
    return fn()
  } catch {
    return null
  }
}