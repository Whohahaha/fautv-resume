# FAU.tv Resume (FAU.tv Weiterschauen)

[English](README.md) · [简体中文](README.zh-CN.md) · **Deutsch**

![License: MIT](https://img.shields.io/badge/license-MIT-blue) ![Userscript](https://img.shields.io/badge/type-userscript-green)

Auf [FAU.tv](https://www.fau.tv), dem Videoportal der FAU Erlangen-Nürnberg, genau dort weiterschauen, wo du aufgehört hast.
Ein kleines Userscript: Es merkt sich den Fortschritt in Vorlesungsaufzeichnungen, zeigt, welche Folgen du schon gesehen hast, und behält deine Sprache.

> Inoffizielles Projekt. Nicht mit der FAU Erlangen-Nürnberg verbunden und nicht von ihr unterstützt.

## Funktionen

- **Automatisch fortsetzen** – öffnest du eine Folge erneut, springt sie zur letzten Position. Der Fortschritt wird alle paar Sekunden und beim Pausieren gespeichert.
- **„Fortsetzen“-Button** – auf der Serienseite führt ein Button direkt vor *Share this series* zur zuletzt gesehenen Folge.
  - Folge nicht fertig → `FORTSETZEN · #2 · 25%`
  - Folge fertig → `NÄCHSTE FOLGE · #3`
  - letzte Folge fertig → `ERNEUT ANSEHEN · #12`
- **Fortschrittsmarken** – jede Folge in der Liste zeigt `▶ 25%` oder `✓ Gesehen`; die zuletzt gesehene ist hervorgehoben.
- **Merkt sich die Sprache** – FAU.tv startet jedes Mal auf Deutsch. Das Skript stellt die zuletzt gewählte Sprache (Englisch oder Deutsch) wieder ein.
- **Spricht deine Sprache** – die ergänzten Beschriftungen folgen der Browsersprache: English, Deutsch oder 简体中文.
- **Privat** – alles bleibt im Browser (`localStorage`). Es wird nichts versendet.

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

Um die Sprache der vom Skript ergänzten Beschriftungen festzulegen, ändere diese Zeile am Dateianfang:

```js
const UI_LANG = 'auto';   // 'auto' | 'en' | 'de' | 'zh'
```

## So funktioniert es

| Teil | Mechanismus |
|---|---|
| Fortschritt | Pro Folge in `localStorage` unter `faututv2:<serie>/<folge>`: Position, Dauer, Status „fertig“, Zeitstempel. |
| Fortsetzen | Bei `loadedmetadata` wird zur gespeicherten Position gesprungen (nicht in den ersten 5 s und letzten 10 s). Vor dem Sprung wird nichts gespeichert, damit alter Fortschritt nicht mit 0:00 überschrieben wird. |
| Fortsetzen-Button | Sucht die zuletzt gesehene Folge der aktuellen Serie und verlinkt sie. |
| Sprache | Merkt sich die Sprache, die du über den Sprachschalter der Seite wählst. Öffnet eine Seite in einer anderen Sprache, ruft das Skript das seiteneigene `/set_lang/<en\|de>` auf und lädt einmal neu (höchstens zweimal, um Schleifen zu vermeiden). |

## Einschränkungen

- Der Fortschritt liegt in einem Browser auf einem Gerät und wird **nicht** synchronisiert. `fau.tv` und `www.fau.tv` gelten als verschiedene Seiten – bleib bei einer Adresse.
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
