import { buildPresence } from "@/builder"
import { getDistDir, getPresenceBySlug } from "@/discover"
import { logger, spinner } from "@/logger"
import type { Command } from "commander"
import { execSync } from "child_process"
import { existsSync, mkdirSync } from "fs"
import { join } from "path"

const zipDir = (sourceDir: string, outputPath: string): void => {
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${join(sourceDir, "*")}' -DestinationPath '${outputPath}' -Force"`,
      { stdio: "pipe" },
    )
    return
  }
  execSync(`zip -qr '${outputPath}' .`, { cwd: sourceDir, stdio: "pipe" })
}

export const registerPack = (program: Command) => {
  program
    .command("pack")
    .description("Zip a built presence for drop-install in the extension")
    .argument("<slug>", "Presence slug")
    .action(async (slug: string) => {
      logger.newline()
      const presence = getPresenceBySlug(slug)
      if (!presence) {
        logger.error(`Presence "${slug}" not found`)
        process.exit(1)
      }

      spinner.start(`Building "${presence.name}"...`)
      const bundle = await buildPresence(presence)
      if (!bundle) {
        spinner.fail(`Build failed for "${slug}"`)
        process.exit(1)
      }
      spinner.succeed(`Built "${presence.name}"`)

      const distDir = join(getDistDir(), "presences", presence.slug)
      if (!existsSync(join(distDir, "metadata.json")) || !existsSync(join(distDir, "bundle.js"))) {
        logger.error(`Missing metadata.json or bundle.js in ${distDir}`)
        process.exit(1)
      }

      const outDir = join(getDistDir(), "packs")
      mkdirSync(outDir, { recursive: true })
      const outputPath = join(outDir, `${presence.slug}.zip`)
      spinner.start("Creating zip...")
      zipDir(distDir, outputPath)
      spinner.succeed(`Packed ${outputPath}`)
      logger.info("Drop this zip on the extension debug panel (developer mode).")
    })
}
