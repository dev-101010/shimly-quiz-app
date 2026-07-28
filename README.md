# Shimly_Quiz — Desktop-App

Native Desktop-App mit eingebettetem Chromium (Electron) für Windows, Linux und
macOS, fest verdrahtet auf <https://www.shimly-quiz.de/>. Inoffizieller Client:
der Fenstertitel lautet durchgehend „Shimly Quiz (Third Party)" und wird vom
Seitentitel nicht überschrieben. Alles Dateisystemseitige heisst schlicht
`Shimly_Quiz`.

## Starten & Bauen

```powershell
npm install          # einmalig
npm start            # App starten
npm run dev          # mit DevTools
npm run icon:fetch   # Original-Icons von der Seite nach build/source/ laden
npm run icon         # daraus build/icon.ico + build/icon.png bauen
npm run dist         # Windows-Builds nach dist/
npm run dist:linux   # Linux-Builds  (nur auf Linux/WSL/Docker)
npm run dist:mac     # macOS-Builds  (nur auf macOS)
```

> **Hinweis zum VSCode-Terminal:** Dort ist `ELECTRON_RUN_AS_NODE=1` gesetzt,
> wodurch `electron .` als reines Node startet. `npm start` löscht die Variable
> selbst; bei direktem Aufruf vorher `Remove-Item Env:ELECTRON_RUN_AS_NODE`.

Jede Plattform lässt sich nur auf sich selbst bauen — Linux-Pakete brauchen
`fakeroot`/`mksquashfs`, macOS braucht `codesign`. Wer nicht alle drei Rechner
hat, baut über GitHub Actions (siehe unten).

Artefakte in `dist/`:

| Plattform | Datei | Anmerkung |
| --- | --- | --- |
| Windows | `Shimly_Quiz_Setup_<version>_windows_x64.exe` | Installer, pro Benutzer, keine Adminrechte |
| Windows | `Shimly_Quiz_portable_<version>_windows_x64.exe` | läuft ohne Installation |
| Linux | `Shimly_Quiz_<version>_linux_x86_64.AppImage` | ausführbar machen, direkt starten |
| Linux | `Shimly_Quiz_<version>_linux_amd64.deb` | Debian/Ubuntu |
| macOS | `Shimly_Quiz_<version>_macOS_arm64.dmg` | Apple Silicon |
| macOS | `Shimly_Quiz_<version>_macOS_x64.dmg` | Intel-Macs |

Die Plattform steht im Namen, weil die Endung allein nicht überall reicht — bei
`.exe`, `.deb` und `.dmg` schon, bei einem ZIP nicht. Ein `zip`-Ziel für macOS
gibt es deshalb nicht mehr: Es wäre nur für automatische Updates über
`electron-updater` nötig, das hier niemand nutzt, hätte aber als einzige Datei
ohne erkennbare Plattform dagestanden.

Dateien, Ordner und Verknüpfungen heissen durchgehend `Shimly_Quiz`; der Zusatz
„(Third Party)" steht ausschliesslich im Fenstertitel.

## Builds über GitHub Actions

[`.github/workflows/build.yml`](.github/workflows/build.yml) baut alle drei
Plattformen parallel auf GitHub-Runnern — Windows, Linux und macOS in einer
Matrix. Ausgelöst wird der Lauf

- manuell über den **Actions**-Tab (`workflow_dispatch`) oder
- automatisch beim Pushen eines Version-Tags:

```powershell
git tag v1.0.1
git push origin v1.0.1
```

Bewusst nicht bei jedem Push, weil jeder Lauf drei VMs belegt. Die fertigen
Dateien hängen als Artefakte am Lauf (30 Tage). Bei einem Tag legt der
`release`-Job zusätzlich einen **Entwurf** eines GitHub-Releases mit allen
Dateien an — Inhalt prüfen, dann selbst veröffentlichen.

## Signatur

Die Builds sind **unsigniert**. Ein selbstsigniertes Zertifikat brachte in der
Praxis nichts: gültig nur auf Rechnern, die es kennen, und SmartScreen warnt
trotzdem weiter. Was Nutzer stattdessen sehen:

- **Windows** — SmartScreen meldet „Unbekannter Herausgeber": *Weitere
  Informationen* → *Trotzdem ausführen*.
- **Linux** — keine Signaturprüfung, AppImage nur ausführbar machen
  (`chmod +x`).
- **macOS** — die App ist ad-hoc signiert, damit sie auf Apple Silicon
  überhaupt startet, aber nicht notarisiert. Beim ersten Start deshalb
  Rechtsklick → *Öffnen* → *Öffnen*, oder einmalig:

  ```bash
  xattr -dr com.apple.quarantine /Applications/Shimly_Quiz.app
  ```

Ohne Warnungen geht es nur mit einem Zertifikat einer öffentlichen CA
(Windows) bzw. einem Apple Developer Account samt Notarisierung (macOS).

## Icon

Das App-Icon stammt aus den Original-Assets von shimly-quiz.de. `npm run
icon:fetch` lädt die dort veröffentlichten PNGs (16 – 310 px) nach
`build/source/`; `npm run icon` baut daraus zwei Dateien und nimmt für jede
Grösse das nächstgrössere Original als Vorlage:

- `build/icon.ico` — Windows, sieben Grössen in einer Datei
- `build/icon.png` — 1024 px, Master für macOS (`.icns`) und Linux;
  electron-builder rechnet daraus die jeweiligen Formate
- `src/renderer/icon.png` — 256 px, Fenster-Icon. Liegt unter `src/`, weil
  `build/` nur Build-Ressource ist und nicht mitgeliefert wird; so zeigt auch
  ein `npm start` aus dem Quellordner das richtige Icon statt dem von Electron

Das grösste verfügbare Original ist 310 px (`ms-icon-310x310.png`), das
1024-px-Master wird also hochgerechnet und ist entsprechend weich. Schärfer
wird es nur mit einer grösseren Vorlage — die Seite liefert keine. Beide
Dateien liegen im Repo, damit die GitHub-Runner sie nicht selbst erzeugen
müssen. Der Lade- und Fehlerbildschirm nutzt dasselbe Motiv
(`src/renderer/logo.png`).

## Was „gaming-optimiert" hier heisst

Ziel ist das Verhalten eines normalen Spiels: Verbindung und Logik laufen im
Hintergrund weiter, nur die Darstellung darf sparen. Ein Browser-Tab wird
minimiert gedrosselt und reisst dabei gern Live-Verbindungen ab — hier nicht.

| Bereich | Umsetzung |
| --- | --- |
| GPU | `ignore-gpu-blocklist`, GPU-Rasterisierung, Zero-Copy, beschleunigtes Canvas |
| Timer | kein Background-Throttling — Quiz-Countdown läuft auch unfokussiert korrekt |
| Occlusion | `CalculateNativeWinOcclusion` aus, damit verdeckte Fenster nicht einfrieren (nur Windows) |
| Audio | Autoplay ohne vorherigen Klick erlaubt |
| Standby | nicht blockiert — die Energieeinstellungen des Systems gelten normal |
| Eingabe | Rechtsklick-Menü und Ctrl+Mausrad-Zoom aus, Ctrl+W abgefangen |
| Optional | `uncapFrameRate` hebt den 60-Hz-Deckel auf (VSync aus) |

## Tastenkürzel

| Taste | Funktion |
| --- | --- |
| `F11` | Vollbild an/aus |
| `Esc` | Vollbild verlassen |
| `F5` / `Ctrl+R` | Neu laden (`Ctrl+Shift+R` ohne Cache) |
| `Ctrl` `+` / `-` / `0` | Zoom grösser / kleiner / zurücksetzen |
| `Alt+←` | Zurück |
| `F1` | Hilfe |
| `Ctrl+,` | Einstellungen |
| `Ctrl+Shift+I` | DevTools — bewusst nirgends in der App genannt |

Auf macOS liegen dieselben Kürzel auf `Cmd` statt `Ctrl`, und Zurück ist
`Cmd+←`. Zwei Ausnahmen, weil `Cmd` dort nicht die Konvention ist:

| Taste (macOS) | Funktion |
| --- | --- |
| `Cmd+?` | Hilfe — `F1` steuert dort die Helligkeit |
| `Ctrl+Cmd+F` | Vollbild — `F11` liegt dort auf Mission Control |
| `Cmd+Alt+I` | DevTools — `Alt` statt `Shift`, wie in Safari und Chrome |

Ebenfalls macOS-typisch: Das Schliessen des Fensters beendet die App nicht —
dafür `Cmd+Q`.

Die Kürzel wertet durchgehend `attachShortcuts` in
[`src/main/main.js`](src/main/main.js) aus, nicht das Menü: dort hängt die
Logik (Zoom merken, Vollbild samt Menüleiste, Reload der Fehlerseite). Die
Menüpunkte zeigen ihr Kürzel deshalb nur an und registrieren es nicht
(`registerAccelerator: false`) — sonst liefe beides gleichzeitig.

## Verhalten

- **Feste Seite:** Nur `shimly-quiz.de` und `www.shimly-quiz.de` laden im
  Fenster. Jeder andere Link — und jedes `target="_blank"` — geht in den
  Standardbrowser. Downloads ebenso.
- **Angemeldet bleiben:** Cookies und LocalStorage liegen in der Partition
  `persist:shimly` und überleben Neustarts.
- **Eine Instanz:** Ein zweiter Start holt das vorhandene Fenster nach vorn.
- **Offline:** Schlägt das Laden fehl, erscheint eine Fehlerseite mit
  „Erneut versuchen". Stürzt der Renderer ab, lädt die App selbstständig neu.
- **Fenster:** Grösse, Position und Maximiert-Status werden gemerkt.
- **Sicherheit:** `contextIsolation` an, `nodeIntegration` aus, Sandbox an,
  `<webview>` blockiert. Der Seite stehen nur `retry()` und `quit()` zur
  Verfügung. Rechte ausser Vollbild, Pointer-Lock und Mikrofon/Kamera werden
  abgelehnt.

## Einstellungen

Über **Datei → Einstellungen…** (bzw. `Strg+,`) öffnet sich ein eigenes Fenster
mit allen Optionen, den Aufräumaktionen und dem Pfad zur `settings.json` samt
Knopf, der den Ordner öffnet.

Die **Entwicklerwerkzeuge** stehen weder im Menü noch auf der Hilfeseite. Für
normale Nutzung haben sie keinen Wert und stiften nur Verwirrung; die
Tastenkombination oben funktioniert aber unverändert. Dieser Abschnitt ist die
einzige Stelle, an der sie dokumentiert ist.

Unter **Hilfe → Hilfe** liegt eine eigene Seite mit allen übrigen Tastenkürzeln und den
Eigenheiten, die man der App nicht ansieht: dass fremde Links im Systembrowser
aufgehen, dass die Anmeldung Neustarts überlebt, was bei veralteten Inhalten
hilft und warum beim ersten Start eine Warnung erscheint. Die Kürzel erzeugt
der Hauptprozess passend zur Plattform, sie stehen nicht fest im Markup.
Daneben führt das Menü zum Forum-Thread („Problem melden") und zur
Projektseite.

Reine Angaben zum Programm stehen getrennt davon unter **Hilfe → Über** (unter
macOS im App-Menü): Version, Electron-, Chromium- und Node-Stand, Plattform,
Zielseite, erlaubte Hosts und der Hinweis, dass dies ein inoffizieller Client
ist. Die Trennung ist Absicht — in den Einstellungen lässt sich etwas ändern,
im Über-Fenster gibt es nichts zu drehen.

Die Menüleiste ist dauerhaft sichtbar und verschwindet nur im Vollbild. Unter
macOS liegt das Menü in der Systemleiste; dort ist es Pflicht, weil sonst
`Cmd+Q` und Kopieren/Einfügen nicht funktionieren. Einen Punkt zum Schliessen
des Fensters gibt es bewusst nicht, passend dazu, dass `Strg+W` abgefangen
wird.

Änderungen wirken sofort, mit zwei Ausnahmen: `startFullscreen` gilt ab dem
nächsten Start, und die beiden Chromium-Schalter (`uncapFrameRate`,
`disableHardwareAcceleration`) stehen beim Programmstart fest. Werden sie
geändert, blendet der Dialog einen Hinweis samt „Jetzt neu starten" ein — und
zwar so lange, bis der Prozess wirklich neu gestartet wurde.

Unter **Daten** stehen zwei Aufräumaktionen, bewusst getrennt:

- **Zwischenspeicher leeren** — bei hängenden Bildern oder veralteten
  Skripten. Räumt zwei getrennte Töpfe: den HTTP-Cache und `cachestorage`,
  aus dem der Service Worker der Seite seine Dateien ausliefert. Der zweite
  ist der weitaus grössere; ohne ihn bliebe die Seite trotz „geleert" auf
  altem Stand. Die Anmeldung bleibt bestehen.
- **Alle Daten löschen** — entfernt zusätzlich Cookies, LocalStorage,
  IndexedDB und Service Worker der Partition `persist:shimly`. Das meldet ab,
  fragt deshalb vorher nach und lädt die Seite anschliessend neu. Die
  `settings.json` bleibt unberührt, die liegt ausserhalb der Session.

Nicht im Dialog steht `blockContextMenu`. Das Rechtsklick-Menü zu erlauben ist
kein Fall für den Alltag, sondern eine Ausnahme — wer sie braucht, ändert den
Wert in der Datei und startet neu.

Die Datei wird beim ersten Start angelegt:

| Plattform | Pfad |
| --- | --- |
| Windows | `%APPDATA%\Shimly_Quiz\settings.json` |
| Linux | `~/.config/Shimly_Quiz/settings.json` |
| macOS | `~/Library/Application Support/Shimly_Quiz/settings.json` |


```json
{
  "startFullscreen": false,
  "uncapFrameRate": false,
  "preventDisplaySleep": false,
  "disableHardwareAcceleration": false,
  "blockContextMenu": true,
  "zoomFactor": 1
}
```

- `startFullscreen` — direkt im Vollbild starten
- `uncapFrameRate` — FPS-Deckel und VSync aus (mehr Last, evtl. Tearing)
- `preventDisplaySleep` — auf `true` setzen, wenn der Rechner während einer
  Runde nicht in den Standby gehen soll
- `disableHardwareAcceleration` — Notausgang bei GPU-Treiberproblemen

## Sprache

Die Oberfläche richtet sich nach der Systemsprache: Deutsch auf deutschsprachigen
Systemen, sonst Englisch. Entschieden wird das einmal beim Start über
`app.getSystemLocale()` in [`src/main/i18n.js`](src/main/i18n.js) — dort liegen
beide Wörterbücher, und sie sind die einzige Quelle für sichtbare Texte.

Menü und Fenstertitel baut der Hauptprozess direkt daraus. Die beiden HTML-Seiten
enthalten selbst keinen Text mehr, sondern nur `data-t`-Platzhalter; sie holen
sich das Wörterbuch synchron über den Kanal `app:strings` und füllen die
Elemente, bevor das Fenster sichtbar wird. Deshalb springt beim Öffnen nichts um.

Unverändert in beiden Sprachen bleibt der Fenstertitel „Shimly Quiz
(Third Party)" — er ist Kennzeichnung, keine Beschriftung.

Eine weitere Sprache ergänzen: Wörterbuch nach dem Muster von `de`/`en` anlegen
und in `strings()` auf das Kürzel abbilden. Dass keine Übersetzung fehlt, lässt
sich über `i18n.dictionaries` prüfen — beide Objekte müssen dieselben Schlüssel
führen (aktuell je 64).

## Projektstruktur

```
src/main/main.js             Fenster, Chromium-Flags, Navigationssperre, Shortcuts
src/main/config.js           Titel, Zielseite, erlaubte Hosts, settings.json
src/main/preload.js          Sandbox-Brücke, Kontextmenü/Zoom/Drop-Handling
src/main/menu.js             Anwendungsmenü (am Fenster, unter macOS global)
src/main/i18n.js             Oberflächentexte deutsch/englisch nach Systemsprache
src/main/settings-window.js  Einstellungsfenster + zugehörige IPC-Kanäle
src/main/settings-preload.js Brücke für das Einstellungsfenster
src/main/about-window.js     Über-Fenster + zugehörige IPC-Kanäle
src/main/about-preload.js    Brücke für das Über-Fenster
src/main/help-window.js      Hilfefenster, erzeugt die Kürzel je Plattform
src/main/help-preload.js     Brücke für das Hilfefenster
src/main/app-info.js         Version, Unterbau und Zielseite als Lesewerte
src/main/window-place.js     platziert Dialoge mittig über dem Hauptfenster
src/renderer/splash.html     Lade- und Fehlerbildschirm
src/renderer/settings.html   Einstellungen
src/renderer/about.html      Über-Fenster
src/renderer/help.html       Hilfeseite
src/renderer/logo.png        Motiv für beide Seiten
src/renderer/icon.png        Fenster-Icon (256 px)
scripts/fetch-icons.js       lädt die Original-Icons nach build/source/
scripts/make-icon.js         baut daraus icon.ico + icon.png (unter Electron)
build/source/                Original-PNGs von shimly-quiz.de
.github/workflows/           CI-Build für Windows, Linux und macOS
```
