import { getDistDir, type PresenceMeta } from "@/discover"
import esbuild from "esbuild"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { join } from "path"
import { fileURLToPath } from "url"
import { loadPresenceLocales } from "@/locales"
import { loadSettingsFile } from "@/settings"

const sdkEntry = fileURLToPath(import.meta.resolve("@nowly/sdk"))
const sdkSrc = join(sdkEntry, "..", "..", "src")

const nowlyPresencePlugin: esbuild.Plugin = {
  name: "nowly-presence",
  setup: (build) => {
    build.onResolve({ filter: /^@nowly\/(presence|sdk)$/ }, () => ({
      path: sdkEntry,
    }))
    build.onResolve({ filter: /^#\// }, (args) => ({
      path: join(sdkSrc, args.path.slice(2)) + ".ts",
    }))
  },
}

export const buildPresence = async (p: PresenceMeta, cwd?: string): Promise<string | null> => {
  const presenceTsPath = join(p.dir, "presence.ts")
  if (!existsSync(presenceTsPath)) return null
  if (p.metadata.iframe === true && (typeof p.metadata.iFrameRegExp !== "string" || !p.metadata.iFrameRegExp.trim())) return null
  const locales = loadPresenceLocales(p.dir)
  const fileSettings = await loadSettingsFile(p.dir)
  const settings = fileSettings ?? extractSettings(readFileSync(presenceTsPath, "utf-8"))
  const settingsOptions = fileSettings === null ? {} : {
    banner: { js: `const __NOWLY_FILE_SETTINGS__ = () => Presence.Settings(${JSON.stringify(fileSettings)}); __NOWLY_FILE_SETTINGS__();` },
    define: { "Presence.Settings": "__NOWLY_FILE_SETTINGS__" },
  }

  const distDir = join(getDistDir(cwd), "presences", p.slug)
  mkdirSync(distDir, { recursive: true })

  const bundlePath = join(distDir, "bundle.js")

  const result = await esbuild.build({
    ...settingsOptions,
    entryPoints: [presenceTsPath],
    bundle: true,
    format: "iife",
    globalName: "__PRESENCE__",
    outfile: bundlePath,
    minify: true,
    legalComments: "none",
    target: "es2022",
    platform: "browser",
    alias: {
      "@nowly/sdk": sdkEntry,
      "@nowly/presence": sdkEntry,
    },
    plugins: [nowlyPresencePlugin],
    write: true,
  })

  if (result.errors.length > 0) return null

  const iframeBundlePath = join(distDir, "iframe.js")
  rmSync(iframeBundlePath, { force: true })

  if (p.metadata.iframe === true) {
    const iframeTsPath = join(p.dir, "iframe.ts")
    if (!existsSync(iframeTsPath)) return null

    const iframeResult = await esbuild.build({
      ...settingsOptions,
      entryPoints: [iframeTsPath],
      bundle: true,
      format: "iife",
      globalName: "__PRESENCE__",
      outfile: iframeBundlePath,
      minify: true,
      legalComments: "none",
      target: "es2022",
      platform: "browser",
      alias: {
        "@nowly/sdk": sdkEntry,
        "@nowly/presence": sdkEntry,
      },
      plugins: [nowlyPresencePlugin],
      write: true,
    })

    if (iframeResult.errors.length > 0) return null
  }

  const bundle = readFileSync(bundlePath, "utf-8")

  if (settings) {
    writeFileSync(join(distDir, "settings.json"), JSON.stringify(settings, null, 2))
  } else {
    rmSync(join(distDir, "settings.json"), { force: true })
  }

  const metadata = locales ? { ...p.metadata, locales } : p.metadata
  writeFileSync(join(distDir, "metadata.json"), JSON.stringify(metadata, null, 2))

  const assetsDir = join(p.dir, "assets")
  if (existsSync(assetsDir)) {
    const distAssets = join(distDir, "assets")
    mkdirSync(distAssets, { recursive: true })
    cpSync(assetsDir, distAssets, { recursive: true })
  }

  const localesDir = join(p.dir, "locales")
  if (locales) {
    cpSync(localesDir, join(distDir, "locales"), { recursive: true })
  }

  return bundle
}

export const buildAllPresences = async (presences: PresenceMeta[], cwd?: string): Promise<void> => {
  mkdirSync(join(getDistDir(cwd), "presences"), { recursive: true })
  const registry: any[] = []

  for (const p of presences) {
    const bundle = await buildPresence(p, cwd)
    if (bundle) {
      const settingsPath = join(getDistDir(cwd), "presences", p.slug, "settings.json")
      const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, "utf-8")) : null
      const locales = loadPresenceLocales(p.dir)
      registry.push({ ...p.metadata, slug: p.slug, settings, ...(locales ? { locales } : {}) })
    }
  }

  writeFileSync(join(getDistDir(cwd), "registry.json"), JSON.stringify(registry, null, 2))
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
