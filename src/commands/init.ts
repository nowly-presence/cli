import { getLetterFromName, getSlugFromName, getSrcDir } from "@/discover"
import { logger, spinner } from "@/logger"
import { input, select } from "@/prompts"
import { metadataJson, presenceTs } from "@/templates/presence"
import type { Command } from "commander"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"

export const registerInit = (program: Command) => {
  program
    .command("init")
    .description("Create a new presence")
    .argument("[name]", "Service name (e.g. Netflix)")
    .option("--category <category>", "Presence category")
    .option("--color <hex>", "Brand color")
    .option("--urls <urls>", "Comma-separated URLs")
    .option("--author <name>", "Author name")
    .option("--github <handle>", "Author GitHub handle")
    .option("--description <text>", "Description (en-US)")
    .action(async (nameArg?: string, opts?: { category?: string; color?: string; urls?: string; author?: string; github?: string; description?: string }) => {
      logger.newline()
      logger.title("✦ Create a new presence")

      const name = nameArg || (await input("Service name:", { validate: (v) => v.trim().length > 0 || "Name is required" }))
      const slug = getSlugFromName(name)
      const letter = getLetterFromName(name)
      const dir = join(getSrcDir(), letter, name)

      if (existsSync(dir)) {
        logger.error(`Presence "${name}" already exists at ${dir}`)
        process.exit(1)
      }

      const category = opts?.category || await select("Category:", [
        { name: "streaming", message: "Streaming" },
        { name: "music", message: "Music" },
        { name: "video", message: "Videos" },
        { name: "social", message: "Social" },
        { name: "gaming", message: "Gaming" },
        { name: "tools", message: "Tools" },
        { name: "ai", message: "AI" },
        { name: "learning", message: "Learning" },
        { name: "creator", message: "Creators" },
        { name: "other", message: "Other" },
      ])

      const color = opts?.color || await input("Brand color (hex):", { initial: "#555555" })
      const urlsInput = opts?.urls || await input("URLs (comma-separated):")
      const urls = urlsInput.split(",").map((u: string) => u.trim()).filter(Boolean)
      const author = opts?.author || await input("Author name:", { initial: "Nowly" })
      const github = opts?.github || await input("Author GitHub (optional):")

      const description = opts?.description || await input("Description (en-US):", { validate: (v) => v.trim().length > 0 || "Description is required" })

      spinner.start("Generating presence files...")

      mkdirSync(dir, { recursive: true })
      mkdirSync(join(dir, "assets"), { recursive: true })

      writeFileSync(join(dir, "metadata.json"), metadataJson({ name, author, github, category, color, urls, description }))
      writeFileSync(join(dir, "presence.ts"), presenceTs)

      spinner.succeed(`Presence "${name}" created at ${dir}`)
      logger.info(`Slug: ${slug}`)
      logger.info("You can add more languages later by editing metadata.json")
      logger.info(`Next: run \`nowly build ${slug}\` to build it`)
    })
}