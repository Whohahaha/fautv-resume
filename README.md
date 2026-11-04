# FAU.tv Resume

**English** · [简体中文](README.zh-CN.md) · [Deutsch](README.de.md)

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Userscript](https://img.shields.io/badge/type-userscript-green)

Pick up where you left off on [FAU.tv](https://www.fau.tv), the video portal of FAU Erlangen-Nürnberg.
A small userscript that remembers your progress in lecture recordings, shows which episodes you have watched, and keeps your language.

**[→ Install (Tampermonkey / Violentmonkey)](https://raw.githubusercontent.com/Whohahaha/fautv-resume/main/fautv-resume.user.js)** · Safari, iPhone & iPad: see [Install](#install)

> Unofficial project. Not affiliated with or endorsed by FAU Erlangen-Nürnberg.

## Features

- **Resume playback** – reopen an episode and it jumps to where you stopped. Progress is saved every few seconds and when you pause.
- **Continue button** – on a series page, a button right before *Share this series* takes you to the episode you watched last.
  - unfinished episode → `CONTINUE · #2 · 25%`
  - finished episode → `NEXT · #3`
  - last episode finished → `REPLAY · #12`
- **Progress badges** – every episode in the list shows `▶ 25% · 45 min left` or `✓ Watched`; the most recent one is highlighted.
- **Playback speed** – the speed you pick (1.5×, 2×, …) is kept for every recording.
- **Remembers your language** – FAU.tv opens in German every time. This script switches back to the language you chose last (English or German).
- **Speaks the site's language** – the labels it adds follow the FAU.tv language: English page → English, German page → Deutsch. 简体中文 is available through `UI_LANG`.
- **Sync between devices (optional)** – keep progress in step on laptop, phone and tablet through a private GitHub Gist of your own. You can also export/import progress as a file.
- **Private** – everything stays in your browser (`localStorage`). Nothing is sent anywhere unless you turn on sync, and then only to your own GitHub account.

## Install

You need a userscript manager.

| Browser | Manager |
|---|---|
| Safari (macOS, iOS, iPadOS) | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |
| Chrome, Edge, Firefox, Safari | [Tampermonkey](https://www.tampermonkey.net) or [Violentmonkey](https://violentmonkey.github.io) |

**Safari + Userscripts**

1. Install Userscripts from the App Store and enable it in *Safari → Settings → Extensions*.
2. Open the extension once, choose a folder for your scripts and allow access to `fau.tv`.
3. Download [`fautv-resume.user.js`](fautv-resume.user.js) and put it into that folder (or open the raw file in Safari and tap *Install*).
4. Reload FAU.tv.

**Tampermonkey / Violentmonkey**

Open the raw [`fautv-resume.user.js`](fautv-resume.user.js) file and click *Install*.

## Usage

Just watch. Open an episode, watch a bit, close it. Next time it continues automatically, and the series page shows where you are.

By default the labels follow the language of the FAU.tv page (English or German). To force a language (including 简体中文), edit this line at the top of the file:

```js
const UI_LANG = 'auto';   // 'auto' | 'en' | 'de' | 'zh'
```

## Sync between devices

Optional. Progress is stored in a **secret Gist in your own GitHub account**; there is no server of ours in between.

1. [Create a GitHub token (classic)](https://github.com/settings/tokens/new?scopes=gist&description=FAU.tv%20Resume) with **only** the `gist` scope.
2. On any FAU.tv series page click **☁ Sync** (next to *Share this series*; Tampermonkey/Violentmonkey also list it in their menu), paste the token and click **Connect**.
3. Do the same on your other devices with the same token. They find the same Gist automatically.

Sync runs when you open FAU.tv, when you come back to the tab, and about 20 seconds after progress changes. For each episode the newer record wins, so devices never overwrite newer progress with older one.
The token is saved in your userscript manager's storage on that device. *Disconnect* removes it. You can revoke it on GitHub at any time.

No GitHub account? Use **Export progress** / **Import progress** in the same panel to move a JSON file between devices.

## How it works

| Part | Mechanism |
|---|---|
| Progress | Saved per episode in `localStorage` under `faututv2:<series>/<episode>`: position, duration, finished flag, timestamp. |
| Resume | On `loadedmetadata`, jumps to the saved position (not within the first 5 s or last 10 s). Nothing is saved before the jump, so old progress is never overwritten with 0:00. |
| Continue button | Looks for the most recently watched episode of the current series and links to it. |
| Language | Remembers the language you pick with the site's language switch. When a page opens in a different language, it calls the site's own `/set_lang/<en\|de>` and reloads once (at most twice, to avoid loops). |

## Limitations

- Progress lives in one browser on one device. It is only synced if you turn on [sync](#sync-between-devices). `fau.tv` is redirected to `www.fau.tv` (progress saved on `fau.tv` is carried over once), so everything lives in one place.
- Clearing website data deletes your progress.
- On a fresh visit the page may briefly load in German before it switches to your language.
- The script relies on the current FAU.tv page structure. If FAU redesigns the portal, something may break – please open an issue.

## Troubleshooting

- **Nothing happens** – check that the script manager is enabled for `fau.tv`, then reload.
- **Doesn't jump to the last position** – open the Safari/Chrome console and look for errors. Please include them in an issue.
- **Language keeps flipping** – make sure cookies are allowed for `fau.tv`; the language is stored in a site cookie.

## Contributing

Issues and pull requests are welcome. The whole project is one file: `fautv-resume.user.js`.

## License

[MIT](LICENSE)
