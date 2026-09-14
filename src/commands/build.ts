import { buildPresence } from "@/builder"
import { getPresenceBySlug, getPresences, type PresenceMeta } from "@/discover"
import { logger, spinner } from "@/logger"
import { watchPresenceDirs } from "@/watch"
import type { Command } from "commander"

const buildOne = async (p: PresenceMeta, exitOnFail: boolean): Promise<boolean> => {
  spinner.start(`Building "${p.name}"...`)
  const bundle = await buildPresence(p)
  if (!bundle) {
    spinner.fail(`Build failed for "${p.name}"`)
    if (exitOnFail) process.exit(1)
    return false
  }
  spinner.succeed(`Built "${p.name}" (${(bundle.length / 1024).toFixed(1)} kB)`)
  return true
}

export const registerBuild = (program: Command) => {
  program
    .command("build")
    .description("Build presence bundles")
    .argument("[slug]", "Presence slug (builds all if omitted)")
    .option("-w, --watch", "Rebuild when presence source files change")
    .action(async (slug?: string, opts?: { watch?: boolean }) => {
      logger.newline()

      if (slug) {
        const p = getPresenceBySlug(slug)
        if (!p) {
          logger.error(`Presence "${slug}" not found`)
          process.exit(1)
        }

        await buildOne(p, true)
        if (!opts?.watch) return
        watchPresenceDirs([p], async (target) => {
          await buildOne(target, false)
        })
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
        if (await buildOne(p, false)) ok++
        else fail++
      }

      logger.newline()
      logger.success(`${ok} built, ${fail} failed`)

      if (!opts?.watch) return
      watchPresenceDirs(presences, async (presence) => {
        await buildOne(presence, false)
      })
    })
}
