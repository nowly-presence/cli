import esbuild from "esbuild"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { runInNewContext } from "node:vm"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isLocale = (value: unknown): boolean =>
  isRecord(value) && Object.values(value).every((text) => typeof text === "string")

const isDefinition = (value: unknown): boolean => {
  if (["boolean", "string"].includes(typeof value)) return true
  if (typeof value === "number") return Number.isFinite(value)
  if (!isRecord(value) || !isLocale(value.label)) return false
  if (value.description !== undefined && !isLocale(value.description)) return false
  switch (value.type) {
    case "boolean":
      return typeof value.default === "boolean"
    case "input":
      return typeof value.default === "string"
        && (value.placeholder === undefined || isLocale(value.placeholder))
    case "select":
      return typeof value.default === "string"
        && Array.isArray(value.options)
        && value.options.length > 0
        && value.options.every((option) =>
          isRecord(option) && typeof option.value === "string" && isLocale(option.label))
        && value.options.some((option) => option.value === value.default)
    case "slider":
      return typeof value.default === "number"
        && Number.isFinite(value.default)
        && ["min", "max", "step"].every((key) =>
          value[key] === undefined || (typeof value[key] === "number" && Number.isFinite(value[key])))
    default:
      return false
  }
}

export const loadSettingsFile = async (dir: string): Promise<Record<string, unknown> | null> => {
  const path = join(dir, "settings.ts")
  if (!existsSync(path)) return null
  try {
    const result = await esbuild.build({
      entryPoints: [path],
      bundle: true,
      format: "cjs",
      platform: "neutral",
      write: false,
      target: "es2022",
      logLevel: "silent",
    })
    const output = result.outputFiles[0]
    if (!output) throw new Error("Settings compilation produced no output")
    const module = { exports: {} }
    const serialized = runInNewContext(`${output.text}
      JSON.stringify(module.exports.default, (_key, value) => {
        if (["function", "symbol", "bigint", "undefined"].includes(typeof value)) {
          throw new Error("Settings must contain JSON values")
        }
        return value
      })`, { module, exports: module.exports }, { timeout: 1000 })
    const exported: unknown = JSON.parse(serialized)
    if (!isRecord(exported) || !Object.values(exported).every(isDefinition)) {
      throw new Error("Expected a default export containing valid setting definitions")
    }
    return exported
  } catch (error) {
    throw new Error(`Invalid settings.ts at ${path}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
