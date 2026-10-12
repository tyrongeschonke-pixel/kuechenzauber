---
name: "Küchenzauber"
description: "Ein ruhiger Küchenarbeitsbereich für vorhandene Zutaten und passende Rezepte."
colors:
  forest: "#204f3d"
  forest-dark: "#173c2e"
  ink: "#193b2d"
  secondary: "#4b6658"
  sage: "#edf3e9"
  white: "#fff"
  line: "#cedbc9"
  gold: "#f5d477"
  error: "#923a2e"
  canvas: "#f5f7f2"
  pistachio-panel: "#e7efdf"
  ingredient-chip: "#e6efe0"
  secondary-button: "#e7eedf"
  focus: "#967218"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "clamp(32px, 4.1vw, 48px)"
    fontWeight: 740
    lineHeight: 1.1
    letterSpacing: "-.035em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.02em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "17px"
    fontWeight: 400
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 650
rounded:
  surface: "16px"
  action: "10px"
  input: "9px"
  chip: "22px"
  toast: "12px"
spacing:
  compact: "8px"
  group: "12px"
  card-gap: "22px"
  panel: "24px"
  large: "32px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    rounded: "{rounded.action}"
    typography: "{typography.label}"
    padding: "13px 20px"
  button-primary-hover:
    backgroundColor: "{colors.forest-dark}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.secondary-button}"
    textColor: "{colors.forest-dark}"
    rounded: "{rounded.action}"
    padding: "13px 20px"
  button-sample:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "12px 16px"
  input-ingredient:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.input}"
    padding: "14px 15px"
    height: "54px"
  ingredient-chip:
    backgroundColor: "{colors.ingredient-chip}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
  recipe-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
  navigation-active:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    rounded: "{rounded.action}"
    padding: "10px 20px"
---

# Design System: Küchenzauber

## Overview

**Creative North Star: "Die ruhige Alltagsküche"**

Küchenzauber ist ein ruhiger Arbeitsbereich für die Alltagsküche. Waldgrün trägt die wichtigsten Aktionen, weiße Flächen bündeln Eingaben und Rezepte, und helle Pistazientöne verbinden ergänzende Hinweise mit dem Küchenkontext. Ein kleiner Safranakzent markiert die Beispielaktion und das Funkeln im Topfzeichen.

Die Gestaltung unterstützt das Lesen und Handeln auf dem iPhone: native Systemschrift, gut getrennte Aufgaben und große berührbare Flächen. Desktop nutzt dieselbe Sprache mit breiteren Spalten. Diese Beschreibung erfasst die vorhandene Implementierung und die Desktop- und Mobilansichten; sie ist keine neue Designrichtung.

**Key Characteristics:**
- Ruhige grüne Tonflächen und klare weiße Arbeitsflächen.
- Systemschrift mit kräftigen, kompakten Überschriften.
- Beschriftete Navigation und große Aktionsflächen.
- Textorientierte Rezeptdarstellung mit sichtbaren fehlenden Zutaten.

## Colors

Die Palette verbindet tiefes Waldgrün mit hellen, leicht grünen Arbeitsflächen und einem warmen, sparsam eingesetzten Akzent. Die Frontmatter enthält die normativen Werte; die CSS-Datei bleibt die Implementierungsquelle.

### Primary

- **Waldgrün** (`forest`): Hauptaktionen, aktive Navigation, Links und Topfzeichen.
- **Tiefes Waldgrün** (`forest-dark`): Hover-Zustand der Hauptaktion und Hintergrund der Statusmeldung.

### Secondary

- **Pistazie** (`pistachio-panel`, `sage`, `secondary-button`, `ingredient-chip`): ergänzende Küchenhinweise, sekundäre Aktionen, Eingabechips und Hover-Flächen.

### Tertiary

- **Safran** (`gold`): Beispielzutaten-Aktion und kleines Funkeln im Zeichen. Warme dunklere Brauntöne kennzeichnen fehlende Zutaten und Verbindungswarnungen in der Implementierung.

### Neutral

- **Küchenpapier** (`canvas`): Hintergrund der App.
- **Weiß** (`white`): Eingabe- und Rezeptflächen.
- **Grüne Tinte** (`ink`): Überschriften und Haupttext.
- **Gedämpftes Blattgrün** (`secondary`): Erläuterungen, Mengenmetadaten und Quellenhinweise.
- **Helle Blattlinie** (`line`): Navigationskante, Trenner und umrissene Nebenaktionen.
- **Ockerfokus** (`focus`): gemeinsamer Tastaturfokus.
- **Ziegelrot** (`error`): vorhandener CSS-Farbtoken für Fehler; Speicherwarnungen verwenden eine helle rote Fläche mit dunklem Text.

## Typography

**Display Font / Body Font:** native Systemschrift mit Apple-, BlinkMacSystem-, Segoe-UI- und Sans-Serif-Fallback. Es werden keine Webfonts geladen.

Die Schrift wirkt direkt und vertraut. Überschriften sind kräftig und leicht eng gesetzt; Erläuterungen nutzen gedämpfte Farbe und großzügigere Zeilenhöhe.

### Hierarchy

- **Display:** die Frage oder der Seitentitel; auf Mobil (36px), in Rezeptdetails (33px). Maximale Breite begrenzt lange Titel; balancierter Umbruch.
- **Headline / Title:** Abschnittstitel und Rezeptnamen. Rezeptkarten nutzen auf Desktop (23px), auf kleineren Bildschirmen (25px).
- **Body:** Grundschrift; Erläuterungen mit Zeilenhöhe (1.6), Rezeptschritte mit (1.75) und maximaler Breite (70ch).
- **Label:** starke Beschriftungen der Eingaben und Aktionen. Hinweise und Quellen erscheinen meist bei (13px), mobile Quellen bei (12px). Navigationslabels gehen auf Mobil von (15px) auf (12px).

## Layout

Der Hauptbereich, die Navigation und der Footer sind auf (1108px) begrenzt; die Kopfzeile auf (1180px). Unter (1180px) gelten seitliche Ränder von (32px), unter (620px) von (20px).

Die Zutatenansicht hat auf Desktop zwei Spalten im Verhältnis (1.05 : .95) mit (34px) Abstand. Unter (620px) wird daraus eine Spalte mit (25px) Abstand. Weiße Eingabefläche und pistazienfarbener Hinweisbereich bleiben getrennt. Rezeptkarten stehen zu dritt mit (22px) Abstand; unter (840px) folgen sie einzeln mit (16px) Abstand. Rezeptdetails teilen sich in Zutaten und Anleitung im Verhältnis (.8 : 1.2); unter (620px) stehen diese untereinander.

Grid-Spalten verwenden schrumpfbare Mindestgrößen; Zutatenfelder und mobile Grid-Kinder dürfen unter ihre natürliche Inhaltsbreite schrumpfen. Lange Namen und Originalzutaten brechen um. Der vorhandene Mindestviewport ist (320px). Footer und Statusmeldung berücksichtigen auf Mobil den unteren sicheren Bildschirmbereich.

## Elevation & Depth

Die App verwendet flache Tonflächen. Weiße Arbeitsbereiche, leichte grüne Begleitflächen und dünne Linien schaffen Tiefe ohne Schatten. Nur die kurzzeitige Statusmeldung schwebt über dem Inhalt.

### Shadow Vocabulary

- **Statusmeldung:** `0 8px 26px #163b2d20`; ausschließlich für den Toast.

Rezeptkarten erscheinen mit einer kurzen vertikalen Clip-Reveal-Animation (280ms) und `cubic-bezier(.16,1,.3,1)`. Der Ladepunkt pulsiert mit (1s). Reduzierte Bewegung deaktiviert beide Animationen.

## Shapes

Arbeitsflächen haben sanfte, größere Ecken (`surface`); Buttons leicht kleinere (`action`), Eingaben und die Beispielaktion die `input`-Rundung. Zutatenchips und Schnellzutaten sind pillenförmig (`chip`). Runde Symbolbuttons messen im Kopf (48px), auf Mobil (44px); Entfernungssymbole haben eine Fläche von (40px). Linien trennen Inhaltsgruppen, ohne jede Fläche zu umranden.

## Components

### Buttons

Deutliche, beschriftete Aktionen mit großzügiger Fläche. Haupt- und Nebenbuttons sind mindestens (50px) hoch, nutzen dieselbe Rundung und starke Labels. Hauptaktionen wechseln beim Hover zu tiefem Waldgrün; Nebenaktionen zu dunklerer Pistazie. Die Safranaktion bleibt auf den Beispielzutaten-Einstieg beschränkt. Deaktivierte Buttons haben reduzierte Deckkraft (.55).

Alle Buttons, Links und Eingaben erhalten bei sichtbarem Tastaturfokus einen Ockerumriss (3px) mit Abstand (4px). Symbolbuttons ergänzen beschriftete Aktionen und haben zugängliche Namen.

### Chips

Vorhandene Zutaten erscheinen als helle grüne Pillen mit Text und separatem Entfernungsknopf. Schnellzutaten sind weiße, fein umrissene Pillen; Hover färbt sie leicht grün. Beide Gruppen umbrechen in mehrere Zeilen. Lange Zutaten brechen innerhalb des Chips um.

### Cards / Containers

Rezeptkarten sind weiß, flach und mit `surface` gerundet. Innenabstand (24px). Oben stehen ein kleiner Rezepttyp und ein Topfsymbol, dann Titel und Metadaten. Verfügbarkeit wird mit Häkchen plus Text, fehlende Zutaten mit warmem Text gekennzeichnet. Der volle Hauptbutton sitzt am unteren Kartenende. Die Küchenhinweisfläche verwendet Pistazie und eine größere Zwischenüberschrift; sie ist keine Rezeptkarte.

### Inputs / Fields

Weiße Eingaben mit dünnem grünem Rand (`#8caa97`), klarer Beschriftung darüber und Hinweis darunter. Die Zutatenzeile kombiniert eine flexible Eingabe mit einem festen grünen Plusbutton (54px). Platzhalter bleiben lesbar; der Fokus folgt dem gemeinsamen Ockerumriss.

### Navigation

Vier beschriftete Bereiche mit kleinen Linienicons: Zutaten, Kochideen, Einkaufsliste und Schon gekocht. Der aktive Bereich wird waldgrün mit weißer Beschriftung; inaktive Bereiche liegen ohne Fläche auf dem Hintergrund und bekommen beim Hover eine helle grüne Fläche. Eine dünne Linie schließt die Navigation nach unten ab. Mobil stehen die vier Buttons in einem Raster mit zwei Spalten; Labels dürfen umbrechen. Der Zutatenzähler bleibt ein kleiner runder Badge im Zutatenbereich.

### Recipe instructions and history

Zutaten im Detail haben Zeilentrenner und runde Statuszeichen. Anleitungsschritte verwenden nummerierte Kreise und ausreichend Zeilenhöhe. Quellenhinweise bleiben sichtbar, kleiner und durch eine Linie abgesetzt. Die Kochhistorie verwendet einfache Zeilen mit Datum, Rezeptname und Rückgängig-Symbol; kein zusätzliches Kartenraster.

## Do's and Don'ts

### Do:

- **Do** use Waldgrün for the selected navigation item and primary task action.
- **Do** keep recipe instructions, ingredient quantities, and source notes readable in their own hierarchy.
- **Do** wrap long recipe names and ingredients; grid children must shrink without horizontal overflow.
- **Do** preserve visible keyboard focus and reduced-motion behavior.
- **Do** stack recipe cards and detail columns at the existing responsive breakpoints.

### Don't:

- **Don't** use the Safranaccent as the default background for primary buttons.
- **Don't** introduce shadows on pantry panels or recipe cards; they are flat in the current system.
- **Don't** shrink touch targets or replace the labeled navigation with icons alone.
- **Don't** rely on color alone to distinguish available from missing ingredients.


### Einkaufsliste (Erweiterung 1.1)

Die bestehende Farb- und Schriftgestaltung bleibt erhalten. Ein weißer Eingabebereich nimmt einzelne Artikel auf. Offene und erledigte Einträge stehen in getrennten flachen Listen mit nativen Kontrollkästchen (24px), einer beschrifteten Zeile und einer Entfernen-Schaltfläche. Rezeptbezüge sind kleine sekundäre Texte. Im Zutatenabschnitt eines Rezepts stehen einzelne Plus-Schaltflächen neben Originalmengen, dazu Aktionen für fehlende oder alle Zutaten. 320- und 390-Pixel-Breiten wurden ohne horizontalen Überlauf geprüft.
