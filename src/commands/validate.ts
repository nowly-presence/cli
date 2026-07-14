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

        const presenceTsPath = join(p.dir, "presence.ts")
        if (!existsSync(presenceTsPath)) issues.push("Missing presence.ts")

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
