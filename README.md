# FAU.tv Resume

**English** · [简体中文](README.zh-CN.md) · [Deutsch](README.de.md)

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Userscript](https://img.shields.io/badge/type-userscript-green)

Pick up where you left off on [FAU.tv](https://www.fau.tv), the video portal of FAU Erlangen-Nürnberg.
A small userscript that remembers your progress in lecture recordings, shows which episodes you have watched, and keeps your language.

> Unofficial project. Not affiliated with or endorsed by FAU Erlangen-Nürnberg.

## Features

- **Resume playback** – reopen an episode and it jumps to where you stopped. Progress is saved every few seconds and when you pause.
- **Continue button** – on a series page, a button right before *Share this series* takes you to the episode you watched last.
  - unfinished episode → `CONTINUE · #2 · 25%`
  - finished episode → `NEXT · #3`
  - last episode finished → `REPLAY · #12`
- **Progress badges** – every episode in the list shows `▶ 25%` or `✓ Watched`; the most recent one is highlighted.
- **Remembers your language** – FAU.tv opens in German every time. This script switches back to the language you chose last (English or German).
- **Speaks the site's language** – the labels it adds follow the FAU.tv language: English page → English, German page → Deutsch. 简体中文 is available through `UI_LANG`.
- **Private** – everything stays in your browser (`localStorage`). Nothing is sent anywhere.

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

## How it works

| Part | Mechanism |
|---|---|
| Progress | Saved per episode in `localStorage` under `faututv2:<series>/<episode>`: position, duration, finished flag, timestamp. |
| Resume | On `loadedmetadata`, jumps to the saved position (not within the first 5 s or last 10 s). Nothing is saved before the jump, so old progress is never overwritten with 0:00. |
| Continue button | Looks for the most recently watched episode of the current series and links to it. |
| Language | Remembers the language you pick with the site's language switch. When a page opens in a different language, it calls the site's own `/set_lang/<en\|de>` and reloads once (at most twice, to avoid loops). |

## Limitations

- Progress lives in one browser on one device. It is **not** synced, and `fau.tv` and `www.fau.tv` count as different sites – pick one address and stick to it.
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
