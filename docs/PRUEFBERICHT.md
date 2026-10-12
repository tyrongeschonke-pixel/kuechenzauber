# Prüfbericht · Küchenzauber

Stand: 12. Oktober 2026. Keine App-Store-Veröffentlichung und keine kostenpflichtigen Dienste eingerichtet.

## Bestanden

- 7 automatisierte Node-Prüfungen: Zutaten-Synonyme/Duplikate, Wortgrenzen und Alternativen, Zutatenpriorität, Vorlieben/14-Tage-Ausnahme, Vorschlagsrunden, Sicherungsvalidierung und vollständiger Rezeptbestand.
- 13 Browser-Prüfungen: Live-Parser für 9 Original-HTML-Quellen (einschließlich Untergruppen, Hinweisen und Portionen), Ablehnung beschädigter Rezeptantworten, Erhalt unveränderter Daten und IndexedDB-Speicherung über erneutes Öffnen.
- 106 Rezeptdatensätze mit 899 Zutaten, 6 getrennten Zutatenhinweisen und 603 Anleitungsblöcken. Alle Datensätze gegen die gespeicherte exakte Quellrevision erneut extrahiert und verglichen. 44 nicht eindeutig strukturierte oder unvollständige Quellen verworfen.
- Sichtbar im Browser geprüft: Zutaten hinzufügen, doppelte Eingaben zusammenführen, drei Vorschläge mit fehlenden Zutaten, vollständige Rezeptanzeige, als gekocht markieren, Historie nach Neustart, rückgängig machen, Sicherungsdatei exportieren, gültige Sicherung vor Übernahme anzeigen/importieren und unvollständige Sicherung ablehnen.
- Desktop sowie 390- und 320-Pixel-Bildschirmbreite geprüft. Nach der Korrektur entspricht die Inhaltsbreite exakt der jeweiligen Bildschirmbreite (kein horizontaler Überlauf).
- Regression sichtbar geprüft: alle drei vorgeschlagenen Gerichte als gekocht markieren, zurückkehren und weitere bisher nicht angezeigte Gerichte aus derselben Runde öffnen.
- Offline-Prüfung: den getrennten Test-Webserver vollständig beendet, die App neu geladen und anschließend Zutaten-Suche sowie vollständige Rezeptdetails erfolgreich geöffnet. Der eigene Testserver ist wieder beendet; die Nutzervorschau auf Port 8300 bleibt zum Ausprobieren erreichbar.
- Unabhängige Durchsicht von UI, Speicherung, Aktualisierung, Sicherungen und Offline-Code. Zwei Fehler korrigiert: schmale Grid-Spalte und vorzeitiger Hinweis auf eine erschöpfte Vorschlagsrunde.
- Mechanische Designprüfung der ursprünglichen Version ohne Befunde.

## Grenzen

- Die Prüfung der Rezepttexte belegt die Quellenübernahme und Struktur. Die Gerichte wurden nicht probegekocht. Angaben der Quellen können unvollständig sein; die App erfindet keine Ergänzungen.
- Die schmalen Ansichten sind Browseransichten, kein Test auf einem echten iPhone. Safari-Installation auf einem physischen Gerät wurde nicht durchgeführt.
- GitHub Pages ist vorbereitet (statische Dateien, Anleitung, optionaler Workflow). Die App wurde nicht in einem GitHub-Account veröffentlicht; es gibt noch keinen öffentlichen App-Link.
- Bei Verlust des lokalen Browser-/App-Speichers hilft nur eine zuvor exportierte Sicherungsdatei. Drittanbieter-Verfügbarkeit kann nicht garantiert werden.


## Erweiterung 1.1: Einkaufsliste

12 Node-Prüfungen bestanden (zusätzlich Originalmengen/Duplikate, Wiederöffnen gekaufter Einträge, nur fehlende Zutaten, alte Sicherungen und Formatversion 2). Sichtbar im Browser geprüft: eigene Artikel hinzufügen, entfernen, abhaken, nach Neustart erhalten und erneut hinzufügen; einzelne, fehlende sowie alle Rezeptzutaten übernehmen ohne doppelte Einträge. Die Rezeptmengen bleiben erhalten. 320 und 390 Pixel ohne horizontalen Überlauf. Unabhängige Quellcode-/Screenshot-Durchsicht ohne wesentliche Befunde. Die Einkaufsliste liegt in derselben lokalen IndexedDB und ist Bestandteil neuer Sicherungsdateien. GitHub-Veröffentlichung weiterhin offen: noch kein verbundener Account und kein öffentlicher Link.

Die erneute mechanische Designprüfung meldet Hinweise zu Schriftgrößen, Farben und Rundungen, die nicht vollständig im dokumentierten Gestaltungsraster aufgeführt sind. Diese Hinweise sind offen; die unabhängige Prüfung fand keine wesentlichen Bedienungs- oder Darstellungsfehler.
