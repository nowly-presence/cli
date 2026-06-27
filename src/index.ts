import { registerBuild } from "@/commands/build"
import { registerInit } from "@/commands/init"
import { registerList } from "@/commands/list"
import { registerValidate } from "@/commands/validate"
import { logger } from "@/logger"
import { confirm, select } from "@/prompts"
import chalk from "chalk"
import { Command } from "commander"
import "dotenv/config"

const program = new Command()
  .name("nowly")
  .description("Nowly presence manager — create, build, validate presences")
  .version("1.2.3")

registerInit(program)
registerBuild(program)
registerList(program)
registerValidate(program)

const showInteractive = async () => {
  logger.newline()
  logger.raw(chalk.cyan(chalk.bold("  ⚡ Nowly Presence Manager")))
  logger.raw(chalk.dim(`  ${"─".repeat(40)}`))
  logger.newline()

  const action = await select("What would you like to do?", [
    { name: "init" as any, message: "Create a new presence" },
    { name: "build" as any, message: "Build presences" },
    { name: "list" as any, message: "List all presences" },
    { name: "validate" as any, message: "Validate presences" },
    { name: "exit" as any, message: "Exit" },
  ])

  logger.newline()

  switch (action) {
    case "init":
      await program.parseAsync(["init"], { from: "user" })
      break
    case "build":
      await program.parseAsync(["build"], { from: "user" })
      break
    case "list":
      await program.parseAsync(["list"], { from: "user" })
      break
    case "validate":
      await program.parseAsync(["validate"], { from: "user" })
      break
    case "exit":
      logger.info("Goodbye!")
      process.exit(0)
  }

  logger.newline()
  const again = await confirm("Do something else?", true)
  if (again) await showInteractive()
  else logger.info("Goodbye!")
}

const main = async () => {
  if (process.argv.length <= 2) {
    await showInteractive()
  } else {
    await program.parseAsync()
  }
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})