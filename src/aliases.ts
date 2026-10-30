export const ALIAS_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/
export const ALIAS_MAX_LENGTH = 80
export const ALIASES_MAX = 10

type AliasPresence = {
  slug: string
  metadata: Record<string, any>
}

const aliasesOf = (presence: AliasPresence): string[] =>
  Array.isArray(presence.metadata.aliases)
    ? presence.metadata.aliases.filter((alias: unknown): alias is string => typeof alias === "string")
    : []

/**
 * Library URL aliases must be lowercase slugs that no other presence already
 * uses as its slug or alias, so `/library/<alias>` resolves to one presence.
 */
export const getAliasIssues = (presence: AliasPresence, presences: AliasPresence[]): string[] => {
  const issues: string[] = []
  const others = presences.filter((other) => other.slug !== presence.slug)

  const slugOwner = others.find((other) => aliasesOf(other).includes(presence.slug))
  if (slugOwner) issues.push(`Slug "${presence.slug}" is already an alias of "${slugOwner.slug}"`)

  const aliases = presence.metadata.aliases
  if (aliases == null) return issues
  if (!Array.isArray(aliases)) return [...issues, "metadata.aliases must be an array of strings"]
  if (aliases.length > ALIASES_MAX) issues.push(`metadata.aliases accepts at most ${ALIASES_MAX} entries`)

  const seen = new Set<string>()
  for (const alias of aliases) {
    if (typeof alias !== "string") {
      issues.push("metadata.aliases must only contain strings")
      continue
    }
    if (alias.length > ALIAS_MAX_LENGTH || !ALIAS_PATTERN.test(alias)) {
      issues.push(`Alias "${alias}" must use lowercase letters, digits, dots or hyphens (max ${ALIAS_MAX_LENGTH} characters)`)
      continue
    }
    if (alias === presence.slug) {
      issues.push(`Alias "${alias}" duplicates the presence slug`)
      continue
    }
    if (seen.has(alias)) {
      issues.push(`Alias "${alias}" is listed more than once`)
      continue
    }
    seen.add(alias)

    const owner = others.find((other) => other.slug === alias)
    if (owner) {
      issues.push(`Alias "${alias}" is already the slug of "${owner.slug}"`)
      continue
    }
    const aliasOwner = others.find((other) => aliasesOf(other).includes(alias))
    if (aliasOwner) issues.push(`Alias "${alias}" is already an alias of "${aliasOwner.slug}"`)
  }

  return issues
}
