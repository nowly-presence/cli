export const presenceTs = `import { PresenceType } from "@nowly/sdk"
import type enUS from "./locales/en-US.json"

const settings = Presence.Settings({
  showButtons: {
    type: "boolean",
    default: true,
    label: {
      "en-US": "Show buttons",
      "fr-FR": "Afficher les boutons",
      "es-ES": "Mostrar botones",
    },
  },
})

const presence = new Presence()

presence.on("UpdateData", async () => {
  const { hostname, pathname, href } = document.location
  const locale = await presence.getStrings<typeof enUS>()
  const showButtons = await presence.getSetting<boolean>("showButtons")

  await presence.setActivity({
    details: presence.formatString(locale.browsing, { hostname }),
    state: pathname,
    largeImageKey: Assets.Logo,
    type: PresenceType.Watching,
    buttons: showButtons === false ? undefined : [{ label: hostname, url: href }],
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
