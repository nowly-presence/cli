# @nowly/cli

Create, validate, build, and test [Nowly](https://nowly.me) presences from a presence workspace. This guide describes the CLI at [source revision `2ab9147`](https://github.com/nowly-presence/cli/tree/2ab914740a2f110196ba8c172922664919d2d8b0).

- [Get started](#get-started)
- [Commands](#commands)
- [Language packs](#language-packs)
- [CLI development and references](#cli-development-and-references)

## Get started

Use **Node.js 22 or newer**. Install the published command:

```sh
npm install -g @nowly/cli
```

Run commands from a workspace containing `src/`, such as the [presences repository](https://github.com/nowly-presence/presences). The CLI also discovers `packages/presences/src/` when run from a parent workspace without its own `src/`; generated `dist/` goes beside the discovered `src/`. Presence directories live under `src/<initial>/<Name>/`, and slugs are lowercase names with spaces replaced by hyphens.

```sh
nowly init "Example"
# At the prompts, use the example.com domain and your own author details.
# Edit src/E/Example/presence.ts and its metadata before testing.
nowly validate example
nowly build example
nowly list
```

`init` asks for the missing category, color, URLs, author, optional GitHub handle, description, and whether Discord already supports the platform through linked accounts. It scaffolds `src/E/Example/` with `presence.ts`, `metadata.json`, `assets/`, and `locales/en-US.json`, `fr-FR.json`, and `es-ES.json`. Keep working from the workspace root for the subsequent commands. Running `nowly` without arguments opens an interactive menu for these workflows.

## Commands

### Initialize: `nowly init [name]`

| Option | Purpose |
| --- | --- |
| `--category <category>` | Choose `streaming`, `music`, `video`, `social`, `gaming`, `tools`, `ai`, `learning`, `creator`, or `other`. |
| `--color <hex>` | Presence accent color (prompt default `#555555`). |
| `--urls <urls>` | Comma-separated URL entries for the presence metadata. |
| `--author <name>` | Author name (prompt default `Nowly`). |
| `--github <handle>` | Author GitHub handle. |
| `--description <text>` | English (`en-US`) description. |
| `--discord-native` | Record `discordNative: true` for a platform Discord already supports through account linking. Without it, answer the yes/no prompt (default no). |

For a non-interactive example, provide all text options and `--discord-native` **only when it is accurate for the platform**. Otherwise, answer the final prompt; do not use that flag merely to bypass it. See [the init implementation](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/commands/init.ts) and [generated template](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/templates/presence.ts).

### Validate: `nowly validate [slug]`

```sh
nowly validate          # All discovered presences
nowly validate example  # One presence
```

Reports valid/invalid counts and issues with required metadata (`name`, `color`, `category`, `description.en-US`, and `url`), `presence.ts`, `assets/`, and `locales/en-US.json`. It also checks optional `discordNative` and iframe metadata/source consistency, plus language-pack contents. **The command reports issues but does not set a failing exit status for invalid presences**; read its results rather than using its exit code as a CI gate. [Validation source](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/commands/validate.ts).

### Build: `nowly build [slug]`

```sh
nowly build                  # Every discovered presence
nowly build example          # One presence
nowly build example --watch  # Rebuild on source changes (also: -w)
```

Produces `dist/presences/<slug>/bundle.js` (minified browser IIFE targeting ES2022) and `metadata.json`. When applicable, it also writes `iframe.js`, extracted `settings.json`, and copies `assets/` and `locales/`. Language packs are included in the built metadata. A source file named `iframe.ts` requires matching iframe metadata; consult the [SDK iframe guide](https://github.com/nowly-presence/sdk/tree/stable#iframe-scripts). [Build source](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/builder.ts).

### Pack: `nowly pack <slug>`

```sh
nowly pack example
nowly pack example --watch  # Rebuild and rezip on changes (also: -w)
```

Builds the presence first, then zips its output as `dist/packs/<slug>.zip`; the archive includes `bundle.js` and `metadata.json`, plus any other built files. Drop it in the extension's Debug panel when using an unpacked development build. Unsigned zip installs are not for store-installed builds; see [Load and test locally](https://docs.nowly.me/presence-development/load-and-test). On non-Windows systems packing calls the system `zip` tool. [Pack source](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/commands/pack.ts).

### Test in a browser: `nowly extension <slugs...>`

```sh
nowly extension example             # Chrome (default)
nowly extension example --firefox   # Firefox
```

Builds the named presences (space- or comma-separated), obtains a browser-specific development extension, and writes an unpacked folder with `dev-presences.json`. Chrome defaults to `dist/extension-dev/`; Firefox defaults to `dist/extension-dev-firefox/`.

| Option | Purpose |
| --- | --- |
| `--chrome`, `--c` | Select Chrome (the default). |
| `--firefox`, `--f` | Select Firefox; do not combine with Chrome selection. |
| `--from <url-or-path>` | Use an extension zip URL or a local **extension directory** instead of the selected browser's CDN zip. |
| `--out <dir>` | Set the output directory name beneath `dist/`. |

The default downloads are `https://cdn.nowly.me/extension/nowly-canary.zip` for Chrome and `https://cdn.nowly.me/extension/nowly-canary-firefox.zip` for Firefox. For Chrome, enable Developer mode at `chrome://extensions` and select the generated folder with **Load unpacked**. For Firefox, use **Load Temporary Add-on** at `about:debugging#/runtime/this-firefox` and select the generated `manifest.json`. See [local testing instructions](https://docs.nowly.me/presence-development/load-and-test) and [extension source](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/commands/extension.ts).

### List: `nowly list`

`nowly list` (alias `nowly ls`) lists discovered presence names, categories, and slugs under `src/`. [List source](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/commands/list.ts).

## Language packs

Language packs are optional for a presence using inline strings. If `locales/` exists, it must include `en-US.json`; other supported files are `fr-FR.json`, `es-ES.json`, `de-DE.json`, `pt-BR.json`, `pl-PL.json`, `ja-JP.json`, `ko-KR.json`, `tr-TR.json`, `ms-MY.json`, and `el-GR.json`. Each is a flat JSON object of string values, with exactly the same keys as `en-US.json`. Unknown files, directories inside `locales/`, invalid JSON, or mismatched keys fail locale loading in validation/build. You need not supply every supported language. [Locale validation source](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/locales.ts).

The generated presence demonstrates typed localization without generated types:

```ts
import type enUS from "./locales/en-US.json"

const presence = new Presence()
presence.on("UpdateData", async () => {
  const strings = await presence.getStrings<typeof enUS>()
  await presence.setActivity({ details: strings.browsing })
})
```

For interpolation such as `"Browsing {hostname}"`, use `presence.formatString(strings.browsing, { hostname })` as in the [scaffold template](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/src/templates/presence.ts). `Presence` and `Assets` are runtime globals; import SDK values and types as needed. See the [SDK guide](https://github.com/nowly-presence/sdk/tree/stable) for the presence API.

## CLI development and references

The [CLI source](https://github.com/nowly-presence/cli/tree/2ab914740a2f110196ba8c172922664919d2d8b0/src) registers commands in `src/index.ts`; their implementations are in `src/commands/`. For contributors changing the CLI rather than authoring a presence, the [package manifest](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/package.json) defines `pnpm build` (`tsup`) and runs it via `prepack`. It declares `@nowly/sdk` as a workspace dependency, so a source build needs that workspace dependency available. The published `nowly` entry point is `bin/cli.js` and imports `dist/index.js`.

License: [MIT](https://github.com/nowly-presence/cli/blob/2ab914740a2f110196ba8c172922664919d2d8b0/LICENSE).
