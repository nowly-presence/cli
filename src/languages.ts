import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

export const SUPPORTED_LANGUAGE_LOCALES = ["en-US", "fr-FR", "es-ES"] as const

export type LanguageLocale = typeof SUPPORTED_LANGUAGE_LOCALES[number]
export type LanguageStrings = Record<string, string>
export type PresenceLanguages = Record<LanguageLocale, LanguageStrings>

const validateDictionary = (value: unknown, filename: string): LanguageStrings => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`languages/${filename} must contain a JSON object`)
  }

  const entries = Object.entries(value)
  if (entries.some(([, text]) => typeof text !== "string")) {
    throw new Error(`languages/${filename} must only contain string values`)
  }

  return Object.fromEntries(entries) as LanguageStrings
}

const compareKeys = (reference: LanguageStrings, candidate: LanguageStrings, locale: LanguageLocale): void => {
  const referenceKeys = Object.keys(reference)
  const candidateKeys = new Set(Object.keys(candidate))
  const missing = referenceKeys.filter((key) => !candidateKeys.has(key))
  const extra = [...candidateKeys].filter((key) => !(key in reference))

  if (missing.length || extra.length) {
    const details = [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      extra.length ? `extra: ${extra.join(", ")}` : "",
    ].filter(Boolean).join("; ")
    throw new Error(`languages/${locale}.json keys must match en-US.json (${details})`)
  }
}

export const loadPresenceLanguages = (presenceDir: string): PresenceLanguages | undefined => {
  const languagesDir = join(presenceDir, "languages")
  if (!existsSync(languagesDir)) return undefined
  if (!statSync(languagesDir).isDirectory()) throw new Error("languages must be a directory")

  const allowedFiles = new Set(SUPPORTED_LANGUAGE_LOCALES.map((locale) => `${locale}.json`))
  const entries = readdirSync(languagesDir, { withFileTypes: true })
  const invalidEntries = entries.filter((entry) => !entry.isFile() || !allowedFiles.has(entry.name))
  if (invalidEntries.length) {
    throw new Error(`languages contains unsupported entries: ${invalidEntries.map((entry) => entry.name).join(", ")}`)
  }

  const dictionaries = {} as PresenceLanguages
  for (const locale of SUPPORTED_LANGUAGE_LOCALES) {
    const filename = `${locale}.json`
    const path = join(languagesDir, filename)
    if (!existsSync(path)) throw new Error(`Missing languages/${filename}`)

    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(path, "utf-8"))
    } catch {
      throw new Error(`languages/${filename} contains invalid JSON`)
    }
    dictionaries[locale] = validateDictionary(parsed, filename)
  }

  compareKeys(dictionaries["en-US"], dictionaries["fr-FR"], "fr-FR")
  compareKeys(dictionaries["en-US"], dictionaries["es-ES"], "es-ES")
  return dictionaries
}
