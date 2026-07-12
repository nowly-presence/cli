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
const CDN_EXTENSION_URL = "https://cdn.nowly.me/extension/nowly-chrome-dev.zip"

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
    .option("--from <url>", "Extension zip URL or file path", CDN_EXTENSION_URL)
    .option("--out <dir>", "Output directory for the dev extension", EXTENSION_DEV_DIR)
    .action(async (slugsRaw: string[], options: { from: string; out: string }) => {
      const slugs = slugsRaw.flatMap((s) => s.split(",").map((x: string) => x.trim())).filter(Boolean)
      if (slugs.length === 0) {
        logger.error("No presence slugs provided")
        process.exit(1)
      }

      const distDir = getDistDir()
      const extDir = join(distDir, options.out)

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

      const from = options.from
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

        const sha256 = await sha256Base64Url(bundle)
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
            signature: "",
            signedAt: new Date().toISOString(),
          },
        })
      }

      writeFileSync(join(extDir, "dev-presences.json"), JSON.stringify(devPresences, null, 2))
      spinner.succeed("dev-presences.json generated")

      logger.newline()
      logger.success(`Dev extension ready at ${extDir}`)
      logger.info("To test:")
      logger.raw("  1. Open chrome://extensions")
      logger.raw("  2. Enable Developer mode (top-right)")
      logger.raw(`  3. Click "Load unpacked" and select: ${extDir}`)
      logger.newline()
    })
}
