# FAU.tv Resume (FAU.tv Weiterschauen)

[English](README.md) · [简体中文](README.zh-CN.md) · **Deutsch**

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Userscript](https://img.shields.io/badge/type-userscript-green)

Auf [FAU.tv](https://www.fau.tv), dem Videoportal der FAU Erlangen-Nürnberg, genau dort weiterschauen, wo du aufgehört hast.
Ein kleines Userscript: Es merkt sich den Fortschritt in Vorlesungsaufzeichnungen, zeigt, welche Folgen du schon gesehen hast, und behält deine Sprache.

**[→ Installieren (Tampermonkey / Violentmonkey)](https://raw.githubusercontent.com/Whohahaha/fautv-resume/main/fautv-resume.user.js)** · Safari, iPhone & iPad: siehe [Installation](#installation)

> Inoffizielles Projekt. Nicht mit der FAU Erlangen-Nürnberg verbunden und nicht von ihr unterstützt.

## Funktionen

- **Automatisch fortsetzen** – öffnest du eine Folge erneut, springt sie zur letzten Position. Der Fortschritt wird alle paar Sekunden und beim Pausieren gespeichert.
- **„Fortsetzen“-Button** – auf der Serienseite führt ein Button direkt vor *Share this series* zur zuletzt gesehenen Folge.
  - Folge nicht fertig → `FORTSETZEN · #2 · 25%`
  - Folge fertig → `NÄCHSTE FOLGE · #3`
  - letzte Folge fertig → `ERNEUT ANSEHEN · #12`
- **Fortschrittsmarken** – jede Folge in der Liste zeigt `▶ 25% · noch 45 Min.` oder `✓ Gesehen`; die zuletzt gesehene ist hervorgehoben.
- **Wiedergabegeschwindigkeit** – die gewählte Geschwindigkeit (1,5×, 2×, …) gilt für alle Aufzeichnungen.
- **Merkt sich die Sprache** – FAU.tv startet jedes Mal auf Deutsch. Das Skript stellt die zuletzt gewählte Sprache (Englisch oder Deutsch) wieder ein.
- **Folgt der Seitensprache** – die ergänzten Beschriftungen folgen der Sprache von FAU.tv: englische Seite → English, deutsche Seite → Deutsch. 简体中文 ist über `UI_LANG` wählbar.
- **Sync zwischen Geräten (optional)** – Fortschritt auf Laptop, Handy und Tablet abgleichen, über ein privates GitHub-Gist in deinem eigenen Konto. Export/Import als Datei geht auch.
- **Privat** – alles bleibt im Browser (`localStorage`). Es wird nichts versendet, außer du schaltest Sync ein – dann nur in dein eigenes GitHub-Konto.

## Installation

Du brauchst einen Userscript-Manager.

| Browser | Manager |
|---|---|
| Safari (macOS, iOS, iPadOS) | [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) |
| Chrome, Edge, Firefox, Safari | [Tampermonkey](https://www.tampermonkey.net) oder [Violentmonkey](https://violentmonkey.github.io) |

**Safari + Userscripts**

1. Userscripts aus dem App Store installieren und unter *Safari → Einstellungen → Erweiterungen* aktivieren.
2. Die Erweiterung einmal öffnen, einen Ordner für Skripte wählen und den Zugriff auf `fau.tv` erlauben.
3. [`fautv-resume.user.js`](fautv-resume.user.js) herunterladen und in diesen Ordner legen (oder die Rohdatei in Safari öffnen und auf *Installieren* tippen).
4. FAU.tv neu laden.

**Tampermonkey / Violentmonkey**

Die Rohdatei [`fautv-resume.user.js`](fautv-resume.user.js) öffnen und auf *Installieren* klicken.

## Benutzung

Einfach schauen: Folge öffnen, ein Stück ansehen, schließen. Beim nächsten Mal geht es automatisch weiter, und die Serienseite zeigt, wo du stehst.

Standardmäßig folgen die Beschriftungen der Sprache der FAU.tv-Seite (Englisch oder Deutsch). Um eine Sprache festzulegen (auch 简体中文), ändere diese Zeile am Dateianfang:

```js
const UI_LANG = 'auto';   // 'auto' | 'en' | 'de' | 'zh'
```

## Sync zwischen Geräten

Optional. Der Fortschritt liegt in einem **geheimen Gist in deinem eigenen GitHub-Konto**; kein Server von uns dazwischen.

1. [GitHub-Token (classic) erstellen](https://github.com/settings/tokens/new?scopes=gist&description=FAU.tv%20Resume) – **nur** mit dem Scope `gist`.
2. Auf einer FAU.tv-Serienseite auf **☁ Sync** klicken (neben *Serie teilen*; in Tampermonkey/Violentmonkey auch im Menü), Token einfügen, **Verbinden**.
3. Auf den anderen Geräten dasselbe mit demselben Token. Sie finden das Gist automatisch.

Synchronisiert wird beim Öffnen von FAU.tv, beim Zurückkehren zum Tab und etwa 20 Sekunden nach einer Änderung. Pro Folge gewinnt der neuere Eintrag, älterer Fortschritt überschreibt nie neueren.
Das Token liegt im Speicher deines Userscript-Managers auf dem Gerät. *Trennen* entfernt es; auf GitHub kannst du es jederzeit widerrufen.

Kein GitHub-Konto? Mit **Fortschritt exportieren** / **importieren** im selben Fenster eine JSON-Datei zwischen Geräten übertragen.

## So funktioniert es

| Teil | Mechanismus |
|---|---|
| Fortschritt | Pro Folge in `localStorage` unter `faututv2:<serie>/<folge>`: Position, Dauer, Status „fertig“, Zeitstempel. |
| Fortsetzen | Bei `loadedmetadata` wird zur gespeicherten Position gesprungen (nicht in den ersten 5 s und letzten 10 s). Vor dem Sprung wird nichts gespeichert, damit alter Fortschritt nicht mit 0:00 überschrieben wird. |
| Fortsetzen-Button | Sucht die zuletzt gesehene Folge der aktuellen Serie und verlinkt sie. |
| Sprache | Merkt sich die Sprache, die du über den Sprachschalter der Seite wählst. Öffnet eine Seite in einer anderen Sprache, ruft das Skript das seiteneigene `/set_lang/<en\|de>` auf und lädt einmal neu (höchstens zweimal, um Schleifen zu vermeiden). |

## Einschränkungen

- Der Fortschritt liegt in einem Browser auf einem Gerät und wird nur synchronisiert, wenn du [Sync](#sync-zwischen-geräten) einschaltest. `fau.tv` wird auf `www.fau.tv` umgeleitet (auf `fau.tv` gespeicherter Fortschritt wird einmalig mitgenommen), damit alles an einem Ort liegt.
- Das Löschen von Websitedaten löscht den Fortschritt.
- Bei einem frischen Besuch kann die Seite kurz auf Deutsch erscheinen, bevor sie in deine Sprache wechselt.
- Das Skript hängt von der aktuellen Seitenstruktur von FAU.tv ab. Bei einem Redesign kann etwas brechen – bitte ein Issue eröffnen.

## Fehlerbehebung

- **Nichts passiert** – prüfen, ob der Userscript-Manager für `fau.tv` aktiv ist, dann neu laden.
- **Springt nicht zur letzten Position** – die Konsole des Browsers auf Fehler prüfen und diese im Issue angeben.
- **Sprache wechselt ständig** – Cookies für `fau.tv` müssen erlaubt sein; die Sprache wird in einem Cookie der Seite gespeichert.

## Mitmachen

Issues und Pull Requests sind willkommen. Das ganze Projekt besteht aus einer Datei: `fautv-resume.user.js`.

## Lizenz

[MIT](LICENSE)
