import chalk from "chalk"
import ora from "ora"

export const logger = {
  info: (msg: string) => console.log(chalk.cyan("  ◆"), msg),
  success: (msg: string) => console.log(chalk.green("  ✔"), msg),
  warning: (msg: string) => console.log(chalk.yellow("  ⚠"), msg),
  error: (msg: string) => console.log(chalk.red("  ✖"), msg),
  muted: (msg: string) => console.log(chalk.dim(`  ${msg}`)),
  raw: (msg: string) => console.log(msg),
  title: (msg: string) => console.log(`\n${chalk.bold(msg)}`),
  sub: (msg: string) => console.log(chalk.dim(`  ${msg}`)),
  separator: () => console.log(chalk.dim("  ─────────────────────────────")),
  newline: () => console.log(""),
}

export const spinner = ora({ color: "cyan" })