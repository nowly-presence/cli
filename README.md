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
| `--category` | string | — | `streaming`, `music`, `video`, `social`, `gaming`, `tools`, `ai`, `learning`, `creator`, `other` |
| `--color` | hex | `#555555` | Accent color for the presence |
| `--urls` | string | — | Comma-separated list of URLs the presence runs on |
| `--author` | string | `Nowly` | Author name |
| `--github` | string | — | Author GitHub handle |
| `--description` | string | — | Short description (en-US) |

Omitting an option starts an interactive prompt.

```bash
nowly init "Netflix" --category streaming --color "#E50914" --urls "netflix.com" --author "Steellgold"
```

Creates:
```
src/N/Netflix/
├── presence.ts
├── metadata.json
└── assets/
```

### `nowly build [slug]`

Build one or all presences.

```bash
nowly build              # Build every presence in src/
nowly build youtube      # Build only the "youtube" presence
```

Each build produces:
- `dist/presences/{slug}/bundle.js` — Minified IIFE (esbuild, `es2022` target)
- `dist/presences/{slug}/metadata.json` — Presence metadata
- `dist/presences/{slug}/settings.json` — Extracted user settings (if any)
- `dist/presences/{slug}/assets/` — Copied assets

A `dist/presences/registry.json` is generated listing all built presences. When a presence
contains a `languages` directory, its validated JSON files are also copied to
`dist/presences/{slug}/languages/` and included in generated metadata.

### Optional language packs

A presence can keep using inline strings without adding language files. To localize its Discord text, add all three supported dictionaries:

```text
src/Y/YouTube/languages/
├── en-US.json
├── fr-FR.json
└── es-ES.json
```

Each file must be a flat JSON object containing the same keys and string values. `en-US.json` is the reference dictionary and runtime fallback. Invalid JSON, unsupported files, missing locales, non-string values, and mismatched keys fail validation and builds.

Use the English dictionary to get typed autocomplete without generating types:

```typescript
import type enUS from "./languages/en-US.json"

const strings = await presence.getStrings<typeof enUS>()
```

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

Checks for required fields: `name`, `color`, `category`, `description.en-US`, `assets.logo`, `assets.icon`, `assets.thumbnail`, and that `presence.ts` exists.

## Interactive mode

Run `nowly` with no arguments to open a menu:

```
┌──────────────────────────────────┐
│  Nowly CLI v1.2.2                │
│                                  │
│  ○ Create a new presence         │
│  ○ Build presences               │
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

See [@nowly/sdk](https://github.com/nowly-presence/sdk) for the full presence API documentation.

```typescript
import { Presence, PresenceType } from "@nowly/presence";

const presence = new Presence({
  Settings({
    "show-button": {
      title: "Show button",
      description: "Display a button on Discord",
      type: "boolean",
      value: true,
    },
  }),
});

presence.on("UpdateData", async () => {
  presence.setActivity({
    details: "Browsing",
    state: "Some page",
    largeImageKey: "logo",
    type: PresenceType.Watching,
  });
});
```

## License

[MIT](./LICENSE)
