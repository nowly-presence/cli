import type { Command } from "commander"
import { buildPresence, buildAllPresences } from "@/builder"
import { getPresenceBySlug, getPresences } from "@/discover"
import { logger, spinner } from "@/logger"

export const registerBuild = (program: Command) => {
  program
    .command("build")
    .description("Build presence bundles")
    .argument("[slug]", "Presence slug (builds all if omitted)")
    .action(async (slug?: string) => {
      logger.newline()

      if (slug) {
        const p = getPresenceBySlug(slug)
        if (!p) {
          logger.error(`Presence "${slug}" not found`)
          process.exit(1)
        }

        spinner.start(`Building "${p.name}"...`)
        const bundle = await buildPresence(p)
        if (!bundle) {
          spinner.fail(`Build failed for "${slug}"`)
          process.exit(1)
        }
        spinner.succeed(`Built "${p.name}" (${(bundle.length / 1024).toFixed(1)} kB)`)
        return
      }

      const presences = getPresences()
      if (presences.length === 0) {
        logger.warning("No presences found")
        return
      }

      logger.title(`Building ${presences.length} presences...`)
      let ok = 0
      let fail = 0

      for (const p of presences) {
        spinner.start(`Building "${p.name}"...`)
        const bundle = await buildPresence(p)
        if (bundle) {
          spinner.succeed(`Built "${p.name}" (${(bundle.length / 1024).toFixed(1)} kB)`)
          ok++
        } else {
          spinner.fail(`Build failed for "${p.name}"`)
          fail++
        }
      }

      logger.newline()
      logger.success(`${ok} built, ${fail} failed`)
    })
}
