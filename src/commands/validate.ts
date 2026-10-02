import { getPresenceBySlug, getPresences } from "@/discover"
import { logger } from "@/logger"
import type { Command } from "commander"
import { existsSync } from "fs"
import { join } from "path"
import { loadPresenceLocales } from "@/locales"

export const registerValidate = (program: Command) => {
  program
    .command("validate")
    .description("Validate presence metadata")
    .argument("[slug]", "Presence slug (validates all if omitted)")
    .action((slug?: string) => {
      logger.newline()
      logger.title("✦ Validate presences")

      const presences = slug
        ? (() => { const p = getPresenceBySlug(slug); return p ? [p] : [] })()
        : getPresences()
      if (presences.length === 0) {
        logger.warning("No presences to validate")
        return
      }

      let ok = 0
      let fail = 0

      for (const p of presences) {
        const issues: string[] = []

        if (!p.metadata.name) issues.push("Missing metadata.name")
        if (!p.metadata.color) issues.push("Missing metadata.color")
        if (!p.metadata.category) issues.push("Missing metadata.category")
        if (!p.metadata.description?.["en-US"]) issues.push("Missing description.en-US")
        const url = p.metadata.url
        if (!url || (Array.isArray(url) && url.length === 0)) issues.push("Missing metadata.url")
        const iframeEnabled = p.metadata.iframe === true
        const iframePattern = p.metadata.iFrameRegExp
        if (p.metadata.iframe != null && typeof p.metadata.iframe !== "boolean") {
          issues.push("metadata.iframe must be a boolean")
        }
        if (iframeEnabled && (typeof iframePattern !== "string" || !iframePattern.trim())) {
          issues.push("metadata.iFrameRegExp is required when metadata.iframe is true")
        }
        if (typeof iframePattern === "string") {
          try {
            new RegExp(iframePattern)
          } catch {
            issues.push("metadata.iFrameRegExp must be a valid regular expression")
          }
        } else if (iframePattern != null) {
          issues.push("metadata.iFrameRegExp must be a string")
        }
        if (!iframeEnabled && iframePattern != null) {
          issues.push("metadata.iFrameRegExp requires metadata.iframe to be true")
        }

        const iframeTsPath = join(p.dir, "iframe.ts")
        if (iframeEnabled && !existsSync(iframeTsPath)) issues.push("Missing iframe.ts for iframe presence")
        if (!iframeEnabled && existsSync(iframeTsPath)) issues.push("iframe.ts requires metadata.iframe to be true")

        if (p.metadata.discordNative != null && typeof p.metadata.discordNative !== "boolean") {
          issues.push("metadata.discordNative must be a boolean")
        }

        const presenceTsPath = join(p.dir, "presence.ts")
        if (!existsSync(presenceTsPath)) issues.push("Missing presence.ts")

        const enUsLocale = join(p.dir, "locales", "en-US.json")
        if (!existsSync(enUsLocale)) issues.push("Missing locales/en-US.json")

        const assetsDir = join(p.dir, "assets")
        if (!existsSync(assetsDir)) issues.push("Missing assets/ directory")

        try {
          loadPresenceLocales(p.dir)
        } catch (error) {
          issues.push(error instanceof Error ? error.message : "Invalid locale packs")
        }

        if (issues.length === 0) {
          logger.success(`${p.name} ✓`)
          ok++
        } else {
          logger.error(`${p.name} ✖`)
          for (const issue of issues) logger.sub(`  ${issue}`)
          fail++
        }
      }

      logger.newline()
      logger.info(`${ok} valid, ${fail} with issues`)
    })
}
