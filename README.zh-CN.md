# FAU.tv Resume（FAU.tv 继续观看）

[English](README.md) · **简体中文** · [Deutsch](README.de.md)

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Userscript](https://img.shields.io/badge/type-userscript-green)

让 [FAU.tv](https://www.fau.tv)（埃尔朗根-纽伦堡大学视频平台）接着上次的进度继续看。
这是一个很小的用户脚本：记住讲座录像的播放进度，标出哪些集看过了，并记住你上次用的语言。

> 非官方项目，与埃尔朗根-纽伦堡大学（FAU）无关，也未获其认可。

## 功能

- **自动续播**：重新打开某一集，会自动跳到上次停下的位置。播放时每隔几秒保存一次，暂停时也会保存。
- **“继续观看”按钮**：在系列页的 *Share this series* 按钮前面，一键回到最近看的那一集。
  - 上次没看完 → `继续观看 · #2 · 25%`
  - 上次已看完 → `下一集 · #3`
  - 最后一集也看完了 → `重新观看 · #12`
- **进度标记**：列表里每一集显示 `▶ 25%` 或 `✓ 已看完`，最近看的一集会高亮。
- **记住语言**：FAU.tv 每次打开都是德语。脚本会自动切回你上次选的语言（英语或德语）。
- **界面跟随网站语言**：网站是英文页面就显示英文，是德语页面就显示德语；也可以通过 `UI_LANG` 固定为中文。
- **隐私**：所有数据只保存在你自己的浏览器（`localStorage`）里，不会发送到任何地方。

## 安装

需要先装一个用户脚本管理器。

| 浏览器 | 管理器 |
|---|---|
| Safari（macOS、iPhone、iPad） | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |
| Chrome、Edge、Firefox、Safari | [Tampermonkey](https://www.tampermonkey.net) 或 [Violentmonkey](https://violentmonkey.github.io) |

**Safari + Userscripts**

1. 在 App Store 安装 Userscripts，然后在 *Safari → 设置 → 扩展* 里启用。
2. 打开一次扩展，选好存放脚本的文件夹，并允许它访问 `fau.tv`。
3. 下载 [`fautv-resume.user.js`](fautv-resume.user.js)，放进这个文件夹（也可以在 Safari 里打开 raw 文件，点“安装”）。
4. 刷新 FAU.tv。

**Tampermonkey / Violentmonkey**

打开 [`fautv-resume.user.js`](fautv-resume.user.js) 的 raw 页面，点“安装”。

## 使用

正常看就行。打开一集，看一会儿，关掉。下次打开会自动接着看，系列页也会显示你看到哪里了。

默认情况下，脚本所加文字跟随 FAU.tv 页面语言（英语或德语）。如果想固定语言（包括中文），改文件开头这一行：

```js
const UI_LANG = 'auto';   // 'auto' | 'en' | 'de' | 'zh'
```

## 原理

| 部分 | 做法 |
|---|---|
| 进度 | 每一集单独存在 `localStorage`，键为 `faututv2:<系列>/<集>`，内容包括位置、时长、是否看完、时间戳。 |
| 续播 | 在 `loadedmetadata` 时跳到保存的位置（开头 5 秒内和结尾 10 秒内不跳）。跳转完成前不保存，所以不会用 0:00 覆盖旧进度。 |
| 继续观看按钮 | 找出当前系列中最近看过的一集并链接过去。 |
| 语言 | 记住你用网站的语言开关选的语言。页面以别的语言打开时，调用网站自己的 `/set_lang/<en\|de>` 并刷新一次（最多两次，防止死循环）。 |

## 限制

- 进度只存在这一台设备的这一个浏览器里，**不会同步**。`fau.tv` 和 `www.fau.tv` 算两个不同的网站，请固定用其中一个。
- 清除网站数据会丢失进度。
- 新开页面时可能先短暂显示德语，再切换成你的语言。
- 脚本依赖 FAU.tv 当前的页面结构，网站改版后可能失效，欢迎提 issue。

## 常见问题

- **没有任何反应**：确认脚本管理器已对 `fau.tv` 启用，然后刷新页面。
- **没有跳到上次位置**：打开浏览器控制台看有没有报错，提 issue 时请附上。
- **语言来回切换**：请确认 `fau.tv` 允许使用 Cookie，网站的语言设置保存在 Cookie 里。

## 参与贡献

欢迎提 issue 和 pull request。整个项目只有一个文件：`fautv-resume.user.js`。

## 许可证

[MIT](LICENSE)
