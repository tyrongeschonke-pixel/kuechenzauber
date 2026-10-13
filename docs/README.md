# Küchenzauber

Eine kostenlose deutschsprachige Rezept-Web-App für den iPhone-Startbildschirm. 106 vollständige Internet-Rezepte aus Wikibooks, Zutatenabgleich, abwechslungsreiche Vorschläge, Einkaufsliste, Kochhistorie, Offline-Nutzung und Sicherungsdateien. Kein Konto für die Nutzung und keine kostenpflichtige KI oder API.

## Küchenzauber jetzt öffnen

**App:** [Küchenzauber öffnen](https://tyrongeschonke-pixel.github.io/kuechenzauber/)

**Quellcode:** [GitHub-Projekt](https://github.com/tyrongeschonke-pixel/kuechenzauber)

Veröffentlicht am 13. Oktober 2026. Im bestehenden GitHub-Projekt liegen die App-Dateien im Ordner `docs`; GitHub Pages verwendet **Deploy from a branch → main → /docs**. Änderungen dort speichern und bei Änderungen an den App-Dateien die Cache-Version in `sw.js` erhöhen. Die Anleitung weiter unten mit `/(root)` beschreibt eine alternative Einrichtung eines neuen Projekts.

Auf dem iPhone den App-Link in Safari öffnen, **Teilen → Zum Home-Bildschirm** wählen und **Hinzufügen** antippen. Falls angeboten, **Als Web-App öffnen** aktivieren. Beim ersten Öffnen Internet verwenden. Ein GitHub-Account ist für die Nutzung nicht nötig.

## Ausprobieren auf diesem Mac

Öffne das Terminal in diesem Ordner und starte:

```sh
python3 -m http.server 8300 --bind 127.0.0.1
```

Öffne anschließend [http://127.0.0.1:8300](http://127.0.0.1:8300). Zum Beenden im Terminal `Ctrl+C` drücken. Die App benötigt einen Webserver; die HTML-Datei durch Doppelklick zu öffnen reicht wegen JavaScript-Modulen und Rezeptdatei nicht aus.

Diese lokale Adresse funktioniert nur auf dem Mac, nicht auf dem iPhone. Zum dauerhaften Benutzen auf dem iPhone veröffentliche die App über HTTPS wie unten beschrieben.

## Kostenlos auf GitHub Pages veröffentlichen

Voraussetzung: ein kostenloser GitHub-Account. Die App und ihr Quellcode werden öffentlich; deine persönlichen Zutaten und die Kochhistorie stehen ausschließlich im lokalen Browser und werden nicht mit veröffentlicht.

1. Auf [GitHub](https://github.com/new) ein neues **öffentliches** Repository namens `kuechenzauber` erstellen.
2. Den **Inhalt dieses Ordners** ins Repository hochladen: `index.html` muss direkt im Hauptverzeichnis liegen. Dateien und Unterordner einschließlich `icons`, `tests`, `scripts` und `.github` beibehalten. Keine Sicherungsdateien hochladen.
3. Unter **Settings → Pages → Build and deployment** als Quelle **Deploy from a branch**, Branch **main** und Ordner **/(root)** auswählen und speichern. Das ist der einfachste Weg ohne zusätzliche Software.
4. Sobald GitHub die Veröffentlichung abgeschlossen hat, lautet die Adresse `https://DEIN-BENUTZERNAME.github.io/kuechenzauber/`. Die tatsächliche Adresse wird unter **Settings → Pages** angezeigt.
5. Die Adresse an deine Mutter weitergeben und einmal in Safari öffnen.

Alternativ enthält `.github/workflows/pages.yml` einen vorbereiteten Bereitstellungsablauf mit Tests. Dafür unter **Settings → Pages** die Quelle **GitHub Actions** wählen und unter **Actions → Küchenzauber auf GitHub Pages → Run workflow** starten. Bei zukünftigen Änderungen an Dateien der App auch die Cache-Versionskennung in `sw.js` erhöhen, damit installierte Apps die neuen Dateien erhalten. Den Workflow anschließend erneut starten.

GitHub Pages unterstützt öffentliche Repositories im kostenlosen Tarif: [GitHub-Dokumentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Keine eigene Domain nötig. Wir haben keinen kostenpflichtigen Dienst integriert; fremde Anbieter können ihre Angebote ändern.

## Auf dem iPhone als App hinzufügen

1. Die veröffentlichte HTTPS-Adresse in **Safari** öffnen.
2. **Teilen → Zum Home-Bildschirm** wählen.
3. Falls angeboten, **Als Web-App öffnen** aktivieren, dann **Hinzufügen** antippen.
4. Die App über ihr neues Symbol öffnen. Beim ersten Start Internet verwenden, damit App und Rezeptbestand für später gespeichert werden.

Die Daten der Safari-Seite und der hinzugefügten Web-App können je nach iOS-Version getrennt gespeichert werden. Deshalb am besten direkt die installierte Web-App verwenden. Vor einem Wechsel Daten über **Sicherung und App-Informationen → Sicherungsdatei herunterladen** sichern und in der anderen Ansicht importieren.

## Benutzung

- Unter **Zutaten** Lebensmittel eingeben, etwa `Kartoffeln, Eier, Zwiebeln`. Mehrere Zutaten mit Komma trennen. Doppelte Schreibweisen und verbreitete Synonyme werden zusammengeführt.
- **Kochideen finden** zeigt bis zu drei Rezepte. Vorhandene und fehlende Zutaten beziehen sich auf die Zutatenliste der jeweiligen Quelle; Salz, Öl usw. werden nicht automatisch als vorhanden angenommen. Mengen werden nicht gegen deinen Vorrat geprüft und nicht automatisch umgerechnet.
- **Weitere Ideen** überspringt schon angezeigte Rezepte der aktuellen Runde. Am Ende kannst du ausdrücklich eine neue Runde starten. Die Sammlung ist endlich und durchsucht nicht das gesamte Internet.
- Rezepte öffnen sich mit Mengen, Anleitung, Hinweisen und Quellenangaben direkt in der App.
- **Einkaufsliste:** Einzelne Einträge mit optionaler Menge hinzufügen, abhaken oder entfernen. Im Rezept übernimmt das Plus neben einer Zutat deren Originalmenge. **Fehlende Zutaten auf die Liste** übernimmt nur fehlende Zutaten; **Alle Zutaten auf die Liste** den ganzen Zutatenabschnitt. Gleiche Einträge werden nur einmal geführt, unterschiedliche Mengen bleiben separate Einträge. Mengen werden nicht automatisch addiert. Ein bereits abgehakter Eintrag wird beim erneuten Hinzufügen wieder offen. Abhaken verschiebt keine Lebensmittel automatisch in deinen Vorrat.
- **Habe ich gekocht** speichert das Gericht. Die App meidet diese Gerichte zunächst 14 Tage und berücksichtigt danach bei ähnlich passenden Rezepten häufig gekochte Gerichtarten. Angezeigte oder angeklickte Rezepte zählen nicht als gekocht.
- Unter **Schon gekocht** einen versehentlichen Eintrag über den Rückgängig-Knopf entfernen. Zutaten werden beim Kochen nicht automatisch gelöscht.
- **Rezept aktualisieren** lädt die aktuelle Version des geöffneten Rezepts. **Rezepte aktualisieren** in den App-Informationen prüft den ganzen bekannten Bestand langsam nacheinander. **Aktualisierung stoppen** beendet die laufende Prüfung. Fehlerhafte neue Inhalte überschreiben nichts. Neue, bisher nicht enthaltene Rezepte benötigen einen erneuten Import und eine Veröffentlichung der aktualisierten Rezeptdatei.
- Beim Export im iPhone-Dialog in **Dateien** sichern. Vor dem Import zeigt die App die erkannten Daten an; erst **Sicherung übernehmen** ersetzt deine derzeitigen Daten.
- Neue Sicherungsdateien (Formatversion 2) enthalten auch die Einkaufsliste samt Häkchen und Rezeptbezug. Ältere Sicherungen (Version 1) werden weiterhin eingelesen und haben eine leere Einkaufsliste. Beim normalen App-Update bleiben vorhandene Zutaten und Kochhistorie erhalten.

## Daten und Offline-Nutzung

Persönliche Daten und Rezeptbestand liegen in IndexedDB; die App-Dateien zusätzlich im Service-Worker-Cache. Es gibt keinen eigenen Backendserver, kein Login und keine Übermittlung deiner Zutaten oder Kochhistorie. Beim Aktualisieren werden ausschließlich die Titel der bekannten Quellrezepte an Wikibooks angefragt. Der Hostinganbieter und die Rezeptquelle erhalten bei Verbindungen gewöhnliche Netzwerkdaten wie die IP-Adresse.

Browserdaten löschen, App entfernen oder Speicherbereinigung durch das Betriebssystem kann lokale Daten entfernen. Deshalb regelmäßig eine Sicherungsdatei herunterladen. Bei nicht verfügbarem lokalen Speicher zeigt die App einen Hinweis. Mit Internet einmal vollständig öffnen, bevor du dich auf die Offline-Nutzung verlässt.

## Prüfungen

Mit Node.js 22 oder neuer:

```sh
npm test
```

Im laufenden lokalen Webserver [Browser-Prüfung](http://127.0.0.1:8300/tests/browser.html) öffnen: Quellparser, beschädigte Antworten und IndexedDB. [Schmale Bildschirmbreiten](http://127.0.0.1:8300/tests/mobile.html) zeigt 390- und 320-Pixel-Ansichten. Die Ergebnisse des tatsächlichen Umsetzungslaufs stehen in `PRUEFBERICHT.md`.

## Rezeptbestand neu importieren

Optional, mit Python 3.9+ und `curl`:

```sh
python3 scripts/import_wikibooks.py --target 110
```

Der Import ist langsam, verwendet einen lokalen `.import-cache` und berücksichtigt Quellenlimits. Ohne mindestens 100 vollständig strukturierte Rezepte bricht er vor dem Schreiben der Rezeptdatei ab. Nur aus vorhandenen Rohdaten erneut aufbauen: `python3 scripts/import_wikibooks.py --offline --target 100`. Nach einem neuen Import die Tests ausführen und `sw.js` versionieren, dann erneut veröffentlichen.

## Quellen und Lizenz

App-Code: MIT, siehe `LICENSE`. Rezepttexte und die bearbeitete Rezeptdatensammlung: CC BY-SA 4.0, siehe `REZEPTQUELLEN.md`. Die HTML-Quellfixtures in `tests/fixtures` stammen von denselben verlinkten Wikibooks-Rezepten und fallen ebenfalls unter CC BY-SA 4.0. Quellseite, genaue Revision und Link zu den Mitwirkenden stehen bei jedem Rezept.

Die Quellenübernahme und die Funktion der App wurden geprüft. Die Rezepte wurden für diese App nicht probegekocht. Quellen können Zutaten oder Zeitangaben unvollständig nennen; die App ergänzt keine erfundenen Mengen oder Anweisungen.
