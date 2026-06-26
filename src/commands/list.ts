import type { Command } from "commander"
import chalk from "chalk"
import { getPresences } from "@/discover"
import { logger } from "@/logger"

export const registerList = (program: Command) => {
  program
    .command("list")
    .alias("ls")
    .description("List all local presences")
    .action(() => {
      logger.newline()
      logger.title("Presences")
      logger.newline()

      const presences = getPresences()
      if (presences.length === 0) {
        logger.warning("No presences found")
        return
      }

      const rows: string[] = []
      for (const p of presences) {
        rows.push(`  ${chalk.bold(p.name.padEnd(20))} ${chalk.dim(p.category.padEnd(12))} ${chalk.dim(p.slug)}`)
      }

      logger.raw(chalk.dim(`  ${"Name".padEnd(20)} ${"Category".padEnd(12)} Slug`))
      logger.raw(chalk.dim(`  ${"─".repeat(54)}`))
      for (const row of rows) logger.raw(row)
      logger.newline()
      logger.info(`${presences.length} presence${presences.length > 1 ? "s" : ""} total`)
    })
}
