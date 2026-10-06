import { buildPresence } from "@/builder"
import { getPresenceBySlug, getPresences, getDistDir } from "@/discover"
import { logger, spinner } from "@/logger"
const canonicalJson = (obj: unknown): string => {
  const sorted = (o: unknown): unknown => {
    if (Array.isArray(o)) return o.map(sorted)
    if (o !== null && typeof o === "object") {
      return Object.keys(o as Record<string, unknown>).sort().reduce((acc: Record<string, unknown>, k) => {
        acc[k] = sorted((o as Record<string, unknown>)[k])
        return acc
      }, {})
    }
    return o
  }
  return JSON.stringify(sorted(obj))
}
import { execSync } from "child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { join } from "path"
import type { Command } from "commander"

const EXTENSION_DEV_DIR = "extension-dev"
const CDN_EXTENSION_URLS = {
  chrome: "https://cdn.nowly.me/extension/nowly-canary.zip",
  firefox: "https://cdn.nowly.me/extension/nowly-canary-firefox.zip",
} as const

type ExtensionBrowser = keyof typeof CDN_EXTENSION_URLS

const defaultOutputDir = (browser: ExtensionBrowser): string =>
  browser === "firefox" ? `${EXTENSION_DEV_DIR}-firefox` : EXTENSION_DEV_DIR

const browserLabel = (browser: ExtensionBrowser): string => (browser === "firefox" ? "Firefox" : "Chrome")

type BrowserOptions = {
  chrome?: boolean
  c?: boolean
  firefox?: boolean
  f?: boolean
}

const validateBrowserOptions = (options: BrowserOptions): ExtensionBrowser => {
  const chrome = options.chrome || options.c
  const firefox = options.firefox || options.f
  if (chrome && firefox) {
    logger.error("Choose either --chrome or --firefox, not both")
    process.exit(1)
  }
  return firefox ? "firefox" : "chrome"
}

const logLoadInstructions = (browser: ExtensionBrowser, extDir: string): void => {
  logger.info(`To test in ${browserLabel(browser)}:`)
  if (browser === "firefox") {
    logger.raw("  1. Open about:debugging#/runtime/this-firefox")
    logger.raw("  2. Click \"This Firefox\" → \"Load Temporary Add-on...\"")
    logger.raw(`  3. Select: ${join(extDir, "manifest.json")}`)
  } else {
    logger.raw("  1. Open chrome://extensions")
    logger.raw("  2. Enable Developer mode (top-right)")
    logger.raw(`  3. Click \"Load unpacked\" and select: ${extDir}`)
  }
}

const sha256Base64Url = async (input: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input))
  const bytes = new Uint8Array(digest)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

const downloadZip = async (url: string, dest: string): Promise<void> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download extension: ${res.status} ${res.statusText}`)
  const buffer = await res.arrayBuffer()
  writeFileSync(dest, Buffer.from(buffer))
}

const extractZip = (zipPath: string, dest: string): void => {
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })

  if (process.platform === "win32") {
    execSync(`powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${dest}'"`, {
      stdio: "pipe",
    })
  } else {
    execSync(`unzip -qo '${zipPath}' -d '${dest}'`, { stdio: "pipe" })
  }
}

export const registerExtension = (program: Command): void => {
  program
    .command("extension")
    .description("Set up a dev extension with built presences")
    .argument("<slugs...>", "Presence slug(s) to bundle (comma or space separated)")
    .option("--from <url-or-path>", "Extension zip URL or file path")
    .option("--out <dir>", "Output directory for the dev extension")
    .option("--chrome, --c", "Use the Chrome development extension (default)")
    .option("--firefox, --f", "Use the Firefox development extension")
    .action(async (
      slugsRaw: string[],
      options: BrowserOptions & { from?: string; out?: string },
    ) => {
      const slugs = slugsRaw.flatMap((s) => s.split(",").map((x: string) => x.trim())).filter(Boolean)
      if (slugs.length === 0) {
        logger.error("No presence slugs provided")
        process.exit(1)
      }

      const browser = validateBrowserOptions(options)
      const from = options.from ?? CDN_EXTENSION_URLS[browser]
      const distDir = getDistDir()
      const extDir = join(distDir, options.out ?? defaultOutputDir(browser))

      for (const slug of slugs) {
        const meta = getPresenceBySlug(slug)
        if (!meta) {
          logger.error(`Presence "${slug}" not found in src/`)
          process.exit(1)
        }

        spinner.start(`Building "${meta.name}"...`)
        const bundle = await buildPresence(meta)
        if (!bundle) {
          spinner.fail(`Build failed for "${slug}"`)
          process.exit(1)
        }
        spinner.succeed(`Built "${meta.name}" (${(bundle.length / 1024).toFixed(1)} kB)`)
      }

      const isUrl = from.startsWith("http://") || from.startsWith("https://")

      if (isUrl) {
        spinner.start("Downloading extension...")
        const zipPath = join(distDir, "extension-dev.zip")
        try {
          await downloadZip(from, zipPath)
          spinner.succeed("Extension downloaded")
        } catch (err) {
          spinner.fail(`Download failed: ${err instanceof Error ? err.message : String(err)}`)
          process.exit(1)
        }

        spinner.start("Extracting extension...")
        extractZip(zipPath, extDir)
        rmSync(zipPath, { force: true })
        spinner.succeed("Extension extracted")
      } else {
        spinner.start("Copying extension...")
        rmSync(extDir, { recursive: true, force: true })
        mkdirSync(extDir, { recursive: true })

        if (existsSync(from)) {
          execSync(process.platform === "win32"
            ? `xcopy /E /I /Y "${from}" "${extDir}"`
            : `cp -r "${from}/." "${extDir}"`
          , { stdio: "pipe" })
        } else {
          logger.error(`Extension path not found: ${from}`)
          process.exit(1)
        }
        spinner.succeed("Extension copied")
      }

      spinner.start("Generating dev-presences.json...")
      const devPresences: Array<{ slug: string; release: unknown }> = []

      for (const slug of slugs) {
        const bundlePath = join(distDir, "presences", slug, "bundle.js")
        const metadataPath = join(distDir, "presences", slug, "metadata.json")

        if (!existsSync(bundlePath) || !existsSync(metadataPath)) {
          spinner.fail(`Built presence not found for "${slug}". Run "nowly build ${slug}" first.`)
          process.exit(1)
        }

        const bundle = readFileSync(bundlePath, "utf-8")
        const metadata = JSON.parse(readFileSync(metadataPath, "utf-8")) as Record<string, unknown>
        metadata.slug = slug
        const iframeBundlePath = join(distDir, "presences", slug, "iframe.js")
        const iframeBundle = existsSync(iframeBundlePath) ? readFileSync(iframeBundlePath, "utf-8") : undefined
        if (metadata.iframe === true && !iframeBundle) {
          spinner.fail(`Built iframe bundle not found for "${slug}"`)
          process.exit(1)
        }

        const settingsPath = join(distDir, "presences", slug, "settings.json")
        if (existsSync(settingsPath)) {
          metadata.settings = JSON.parse(readFileSync(settingsPath, "utf-8"))
        }

        const sha256 = await sha256Base64Url(bundle)
        const iframeSha256 = iframeBundle ? await sha256Base64Url(iframeBundle) : undefined

        const metadataHash = await sha256Base64Url(canonicalJson(metadata))

        devPresences.push({
          slug,
          release: {
            slug,
            version: (metadata.version as string) ?? `0.0.0-dev.${Date.now()}`,
            metadata,
            bundle,
            sha256,
            metadataHash,
            ...(iframeBundle ? { iframeBundle, iframeSha256 } : {}),
            signature: "",
            signedAt: new Date().toISOString(),
          },
        })
      }

      writeFileSync(join(extDir, "dev-presences.json"), JSON.stringify(devPresences, null, 2))
      spinner.succeed("dev-presences.json generated")

      logger.newline()
      logger.success(`${browserLabel(browser)} dev extension ready at ${extDir}`)
      logLoadInstructions(browser, extDir)
      logger.newline()
    })
}
