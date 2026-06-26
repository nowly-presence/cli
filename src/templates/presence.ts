export const presenceTs = `import { PresenceType } from "@nowly/presence"

const presence = new Presence()

presence.on("UpdateData", async () => {
  const { hostname, pathname, href } = document.location

  await presence.setActivity({
    details: \`Browsing \${hostname}\`,
    state: pathname,
    largeImageKey: Assets.Logo,
    type: PresenceType.Watching,
  })
})
`

export const metadataJson = (data: {
  name: string
  author: string
  github?: string
  category: string
  color: string
  urls: string[]
  descriptionEn: string
  descriptionFr?: string
  descriptionEs?: string
}) => {
  const desc: Record<string, string> = { "en-US": data.descriptionEn }
  if (data.descriptionFr) desc["fr-FR"] = data.descriptionFr
  if (data.descriptionEs) desc["es-ES"] = data.descriptionEs

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
      assets: {
        logo: "logo.png",
        icon: "icon.png",
        thumbnail: "thumbnail.jpg",
      },
    },
    null,
    2,
  )
}
