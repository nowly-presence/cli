export const presenceTs = `import { PresenceType } from "@nowly/sdk"
import type enUS from "./locales/en-US.json"

const presence = new Presence()

presence.on("UpdateData", async () => {
  const { hostname, pathname, href } = document.location
  const locale = await presence.getStrings<typeof enUS>()

  await presence.setActivity({
    details: presence.formatString(locale.browsing, { hostname }),
    state: pathname,
    largeImageKey: Assets.Logo,
    type: PresenceType.Watching,
  })
})
`

export const localeJson = (browsing: string): string =>
  JSON.stringify({ browsing }, null, 2)

export const metadataJson = (data: {
  name: string
  author: string
  github?: string
  category: string
  color: string
  urls: string[]
  description: string
}) => {
  const desc: Record<string, string> = { "en-US": data.description }

  return JSON.stringify(
    {
      name: data.name,
      author: {
        name: data.author,
        ...(data.github ? { github: data.github } : {}),
      },
      url: data.urls,
      color: data.color,
      category: data.category,
      description: desc,
    },
    null,
    2,
  )
}
