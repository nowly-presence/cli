# @nowly/cli

CLI to create, build, and validate [Nowly](https://nowly.me) presences.

## Install

```bash
npm install -g @nowly/cli
```

Requires **Node.js 22+**.

## Quick start

```bash
nowly init "YouTube"
cd src/Y/YouTube
# Edit presence.ts, then:
nowly build YouTube
```

`nowly build` outputs to `dist/presences/{slug}/` with `bundle.js`, `metadata.json`, and optional settings and language packs.

## Commands

### `nowly init [name]`

Scaffold a new presence.

| Option | Type | Default | Description |
|---|---|---|---|
| `--category` | string | - | `streaming`, `music`, `video`, `social`, `gaming`, `tools`, `ai`, `learning`, `creator`, `other` |
| `--color` | hex | `#555555` | Accent color for the presence |
| `--urls` | string | - | Comma-separated list of URLs the presence runs on |
| `--author` | string | `Nowly` | Author name |
| `--github` | string | - | Author GitHub handle |
| `--description` | string | - | Short description (en-US) |
| `--discord-native` | boolean | prompt | Write `discordNative: true` when Discord already supports the platform via account linking |

Omitting an option starts an interactive prompt. Without `--discord-native`, init asks this as a yes/no (default no) and only writes the flag when the answer is yes.

```bash
nowly init "Netflix" --category streaming --color "#E50914" --urls "netflix.com" --author "Steellgold"
nowly init "Spotify" --discord-native
```

Creates:
```
src/N/Netflix/
├── presence.ts
├── metadata.json
├── assets/
└── locales/
    ├── en-US.json
    ├── fr-FR.json
    └── es-ES.json
```

### `nowly build [slug]`

Build one or all presences.

```bash
nowly build              # Build every presence in src/
nowly build youtube      # Build only the "youtube" presence
nowly build youtube -w   # Rebuild whenever the presence's source files change
```

Each build produces:
- `dist/presences/{slug}/bundle.js` - Minified IIFE (esbuild, `es2022` target)
- `dist/presences/{slug}/metadata.json` - Presence metadata
- `dist/presences/{slug}/settings.json` - Extracted user settings (if any)
- `dist/presences/{slug}/assets/` - Copied assets

A `dist/presences/registry.json` is generated listing all built presences. When a presence
contains a `locales` directory, its validated JSON files are also copied to
`dist/presences/{slug}/locales/` and included in generated metadata.

### Optional language packs

A presence can keep using inline strings without adding language files. To localize its Discord text, add all three supported dictionaries:

```text
src/Y/YouTube/locales/
├── en-US.json
├── fr-FR.json
└── es-ES.json
```

Each file must be a flat JSON object containing the same keys and string values. `en-US.json` is the reference dictionary and runtime fallback. Invalid JSON, unsupported files, missing locales, non-string values, and mismatched keys fail validation and builds.

Use the English dictionary to get typed autocomplete without generating types:

```typescript
import type enUS from "./locales/en-US.json"

const locale = await presence.getStrings<typeof enUS>()
```

### `nowly pack <slug>`

Build a presence and zip it for drop-install in the extension Debug panel.

```bash
nowly pack youtube
nowly pack youtube --watch   # rebuild and rezip whenever source files change
```

Writes `dist/packs/{slug}.zip` (`metadata.json` + `bundle.js`, plus `settings.json`, assets, and locales when present). Unsigned zips install only on unpacked builds or with developer mode enabled.

### `nowly extension <slugs...>`

Download (or copy) a Chrome dev extension and bake one or more built presences into it.

```bash
nowly extension youtube
nowly extension youtube github --from ../nowly/apps/extension/dist/chrome
```

| Option | Default | Description |
|---|---|---|
| `--from <url-or-path>` | `https://cdn.nowly.me/extension/nowly-canary.zip` | Extension zip URL to download, or a local extension build directory to copy |
| `--out <dir>` | `extension-dev` | Output directory name under `dist/` |

Writes `dist/extension-dev` with `dev-presences.json`. Load that folder unpacked at `chrome://extensions`.

See [Load and test locally](https://nowly.me/docs/presence-development/load-and-test).

### `nowly list` (alias: `ls`)

List all presences in `src/`.

```bash
nowly list

  Name       Category      Slug
 ─────────────────────────────────
  YouTube    video         youtube
  Netflix    streaming     netflix
  GitHub     tools         github
  ...
```

### `nowly validate [slug]`

Validate presence metadata and structure.

```bash
nowly validate           # Validate all presences
nowly validate youtube   # Validate only "youtube"
```

Checks for required fields: `name`, `color`, `category`, `description.en-US`, `url`, `presence.ts`, `locales/en-US.json`, and `assets/`. If `discordNative` is present, it must be a boolean.

## Interactive mode

Run `nowly` with no arguments to open a menu:

```
┌──────────────────────────────────┐
│  Nowly Presence Manager          │
│                                  │
│  ○ Create a new presence         │
│  ○ Build presences               │
│  ○ Pack a presence zip           │
│  ○ Set up a local extension for testing │
│  ○ List all presences            │
│  ○ Validate presences            │
│  ○ Exit                          │
└──────────────────────────────────┘
```

After each action you can choose to continue or exit.

## Project structure

```
├── src/
│   ├── A/
│   │   └── Amazon/
│   │       ├── presence.ts
│   │       └── metadata.json
│   ├── G/
│   │   └── GitHub/
│   │       ├── presence.ts
│   │       └── metadata.json
│   └── ...
├── dist/
│   └── presences/
│       ├── amazon/
│       │   ├── bundle.js
│       │   ├── metadata.json
│       │   └── settings.json
│       ├── github/
│       │   └── ...
│       └── registry.json
└── package.json
```

## Presence script API

See [@nowly/sdk](https://github.com/nowly-presence/sdk) for the full presence API documentation. `Presence`, `Settings`, and `Assets` are globals injected by the extension at runtime - no import needed:

```typescript
import { PresenceType } from "@nowly/sdk"

const settings = Presence.Settings({
  "show-button": {
    type: "boolean",
    default: true,
    label: { "en-US": "Show button" },
    description: { "en-US": "Display a button on Discord" },
  },
})

const presence = new Presence(settings)

presence.on("UpdateData", async () => {
  presence.setActivity({
    details: "Browsing",
    state: "Some page",
    largeImageKey: Assets.Logo,
    type: PresenceType.Watching,
  })
})
```

## License

[MIT](./LICENSE)
