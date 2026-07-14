import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

export const SUPPORTED_PRESENCE_LOCALES = ["en-US", "fr-FR", "es-ES"] as const

export type PresenceLocaleCode = typeof SUPPORTED_PRESENCE_LOCALES[number]
export type LocaleStrings = Record<string, string>
export type PresenceLocales = Record<PresenceLocaleCode, LocaleStrings>

const validateDictionary = (value: unknown, filename: string): LocaleStrings => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`locales/${filename} must contain a JSON object`)
  }

  const entries = Object.entries(value)
  if (entries.some(([, text]) => typeof text !== "string")) {
    throw new Error(`locales/${filename} must only contain string values`)
  }

  return Object.fromEntries(entries) as LocaleStrings
}

const compareKeys = (reference: LocaleStrings, candidate: LocaleStrings, locale: PresenceLocaleCode): void => {
  const referenceKeys = Object.keys(reference)
  const candidateKeys = new Set(Object.keys(candidate))
  const missing = referenceKeys.filter((key) => !candidateKeys.has(key))
  const extra = [...candidateKeys].filter((key) => !(key in reference))

  if (missing.length || extra.length) {
    const details = [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      extra.length ? `extra: ${extra.join(", ")}` : "",
    ].filter(Boolean).join("; ")
    throw new Error(`locales/${locale}.json keys must match en-US.json (${details})`)
  }
}

export const loadPresenceLocales = (presenceDir: string): PresenceLocales | undefined => {
  const localesDir = join(presenceDir, "locales")
  if (!existsSync(localesDir)) return undefined
  if (!statSync(localesDir).isDirectory()) throw new Error("locales must be a directory")

  const allowedFiles = new Set(SUPPORTED_PRESENCE_LOCALES.map((locale) => `${locale}.json`))
  const entries = readdirSync(localesDir, { withFileTypes: true })
  const invalidEntries = entries.filter((entry) => !entry.isFile() || !allowedFiles.has(entry.name))
  if (invalidEntries.length) {
    throw new Error(`locales contains unsupported entries: ${invalidEntries.map((entry) => entry.name).join(", ")}`)
  }

  const dictionaries = {} as PresenceLocales
  for (const locale of SUPPORTED_PRESENCE_LOCALES) {
    const filename = `${locale}.json`
    const path = join(localesDir, filename)
    if (!existsSync(path)) throw new Error(`Missing locales/${filename}`)

    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(path, "utf-8"))
    } catch {
      throw new Error(`locales/${filename} contains invalid JSON`)
    }
    dictionaries[locale] = validateDictionary(parsed, filename)
  }

  compareKeys(dictionaries["en-US"], dictionaries["fr-FR"], "fr-FR")
  compareKeys(dictionaries["en-US"], dictionaries["es-ES"], "es-ES")
  return dictionaries
}
