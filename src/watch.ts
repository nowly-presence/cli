import type { PresenceMeta } from "@/discover"
import { logger } from "@/logger"
import { watch } from "fs"

const DEBOUNCE_MS = 250

export const watchPresenceDirs = (
  presences: PresenceMeta[],
  onChange: (presence: PresenceMeta) => Promise<void>,
): void => {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  const schedule = (presence: PresenceMeta): void => {
    const previous = timers.get(presence.slug)
    if (previous) clearTimeout(previous)
    timers.set(
      presence.slug,
      setTimeout(() => {
        void onChange(presence)
      }, DEBOUNCE_MS),
    )
  }

  for (const presence of presences) {
    const dir = presence.dir
    try {
      watch(dir, { recursive: true }, () => schedule(presence))
    } catch {
      watch(dir, () => schedule(presence))
    }
  }

  logger.info("Watching for changes. Reload the unpacked extension, or drop the zip again.")
  logger.info("Press Ctrl+C to stop.")
}
