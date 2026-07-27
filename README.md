# Shimly_Quiz — Windows-App

Native Windows-App mit eingebettetem Chromium (Electron), fest verdrahtet auf
<https://www.shimly-quiz.de/>. Inoffizieller Client: der Fenstertitel lautet
durchgehend „Shimly Quiz (Third Party)" und wird vom Seitentitel nicht
überschrieben. Alles Dateisystemseitige heisst schlicht `Shimly_Quiz`.

## Starten & Bauen

```powershell
npm install          # einmalig
npm start            # App starten
npm run dev          # mit DevTools
npm run icon:fetch   # Original-Icons von der Seite nach build/source/ laden
npm run icon         # daraus build/icon.ico bauen
npm run dist         # Installer + Portable nach dist/
```

> **Hinweis zum VSCode-Terminal:** Dort ist `ELECTRON_RUN_AS_NODE=1` gesetzt,
> wodurch `electron .` als reines Node startet. `npm start` löscht die Variable
> selbst; bei direktem Aufruf vorher `Remove-Item Env:ELECTRON_RUN_AS_NODE`.

`npm run dist` erzeugt in `dist/`:

- `Shimly_Quiz_Setup_<version>.exe` — Installer mit Start-Menü- und
  Desktop-Verknüpfung, Installation pro Benutzer (keine Adminrechte nötig)
- `Shimly_Quiz_portable_<version>.exe` — läuft ohne Installation

Dateien, Ordner und Verknüpfungen heissen durchgehend `Shimly_Quiz`; der Zusatz
„(Third Party)" steht ausschliesslich im Fenstertitel.

## Signatur

Die Builds werden mit einem selbstsignierten Zertifikat signiert, damit Windows
statt „Unbekannter Herausgeber" den Namen anzeigt. Einmalig:

```powershell
npm run cert     # Zertifikat anlegen und lokal als vertrauenswürdig eintragen
```

Danach signiert jedes `npm run dist` automatisch — der Schlüssel bleibt im
Windows-Zertifikatsspeicher (`Cert:\CurrentUser\My`), es liegt also **kein
privater Schlüssel und kein Passwort im Projekt**. Konfiguriert über
`build.win.signtoolOptions.certificateSubjectName` in der `package.json`;
signiert wird SHA-256 mit Zeitstempel, damit die Signatur das Ablaufdatum des
Zertifikats überdauert.

Herausgebernamen ändern: `certificateSubjectName` in der `package.json` und
`-Subject` in [`scripts/make-cert.ps1`](scripts/make-cert.ps1) anpassen, dann
`npm run cert` erneut ausführen.

**Was das bringt und was nicht:** Auf Rechnern, die das Zertifikat kennen, zeigt
Windows den Herausgeber und die Signatur gilt als gültig. Auf fremden Rechnern
ist sie ungültig, und SmartScreen warnt weiter — dagegen hilft nur ein
Zertifikat einer öffentlichen CA. Auf weiteren eigenen Rechnern importierst du
`build/cert/code-signing.cer` (enthält nur den öffentlichen Teil):

```powershell
Import-Certificate -FilePath code-signing.cer `
  -CertStoreLocation Cert:\CurrentUser\Root
```

Das vertraut genau diesem einen Zertifikat, nicht einer Signierstelle — es ist
ein End-Entity-Zertifikat, keine CA. Trotzdem gilt: Wer den privaten Schlüssel
aus deinem Benutzerprofil bekommt, kann auf diesen Rechnern vertrauenswürdig
signieren.

> `npm run cert` leert vorher `PSModulePath`. Zeigt die Variable auf
> PowerShell-7-Pfade — im pwsh-Terminal geerbt —, lädt Windows PowerShell 5.1
> ein inkompatibles Security-Modul, und dann fehlt das `Cert:`-Laufwerk.

## Icon

Das App-Icon stammt aus den Original-Assets von shimly-quiz.de. `npm run
icon:fetch` lädt die dort veröffentlichten PNGs (16 – 192 px) nach
`build/source/`; `npm run icon` baut daraus `build/icon.ico` in sieben Grössen
und nimmt für jede das nächstgrössere Original als Vorlage. Das grösste
Original ist 192 px, die 256-px-Stufe wird also hochgerechnet. Der Lade- und
Fehlerbildschirm nutzt dasselbe Motiv (`src/renderer/logo.png`).

## Was „gaming-optimiert" hier heisst

Ziel ist das Verhalten eines normalen Spiels: Verbindung und Logik laufen im
Hintergrund weiter, nur die Darstellung darf sparen. Ein Browser-Tab wird
minimiert gedrosselt und reisst dabei gern Live-Verbindungen ab — hier nicht.

| Bereich | Umsetzung |
| --- | --- |
| GPU | `ignore-gpu-blocklist`, GPU-Rasterisierung, Zero-Copy, beschleunigtes Canvas |
| Timer | kein Background-Throttling — Quiz-Countdown läuft auch unfokussiert korrekt |
| Occlusion | `CalculateNativeWinOcclusion` aus, damit verdeckte Fenster nicht einfrieren |
| Audio | Autoplay ohne vorherigen Klick erlaubt |
| Standby | nicht blockiert — die Energieeinstellungen von Windows gelten normal |
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
| `Ctrl+Shift+I` | DevTools |

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

`%APPDATA%\Shimly_Quiz\settings.json` (wird beim ersten Start angelegt):

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

## Projektstruktur

```
src/main/main.js        Fenster, Chromium-Flags, Navigationssperre, Shortcuts
src/main/config.js      Titel, Zielseite, erlaubte Hosts, settings.json
src/main/preload.js     Sandbox-Brücke, Kontextmenü/Zoom/Drop-Handling
src/renderer/           Lade- und Fehlerbildschirm + logo.png
scripts/fetch-icons.js  lädt die Original-Icons nach build/source/
scripts/make-icon.js    baut daraus build/icon.ico (läuft unter Electron)
build/source/           Original-PNGs von shimly-quiz.de
```
