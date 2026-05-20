# Game Elements

Dieses Dokument beschreibt nicht die technische Struktur des Schemas, sondern die Spielelemente, die sich mit dem aktuellen World-Modell bereits ausdruecken lassen.

Es beantwortet im Kern die Frage: Welche Arten von spielerischen Situationen, Objekten und Mechaniken koennen wir heute schon sauber modellieren?

## Aktuell gut abbildbare Spielelemente

### Raeume und Orte

Das Modell kann klar getrennte Orte mit eigener Beschreibung abbilden.

Moeglich sind aktuell:

- Startorte
- Aussen- und Innenraeume
- benannte Zwischenorte
- atmosphaerisch markierte Orte ueber `tags`
- Ortswechsel ueber explizite `ways`

Typische Beispiele:

- Wiese
- Waldrand
- Huetteninnenraum
- Keller
- Turm
- Waldlichtung

### Wege und Zugaenge

Das Modell kann gerichtete Verbindungen zwischen Raeumen ausdruecken.

Moeglich sind aktuell:

- Himmelsrichtungen wie `nord` oder `sued`
- benannte Zugaenge wie `huette betreten`
- bedingte Zugaenge, die erst nach einer Zustandsaenderung offen sind
- alternative sprachliche Formulierungen ueber `aliases`

Dadurch lassen sich nicht nur Kartenwege, sondern auch "funktionale" Uebergaenge modellieren.

### Sichtbare Weltobjekte

Objekte sind globale Instanzen, die in Raeumen sichtbar gemacht werden.

Moeglich sind aktuell:

- statische Kulissenobjekte
- interagierbare Dinge
- wiederkehrende Objekte, die fachlich global dieselbe Instanz bleiben
- semantische Einordnung ueber `tags`
- sprachliche Ansprechbarkeit ueber `aliases`

Typische Beispiele:

- Sonne
- Tuer
- Huette
- Laterne
- Hebel
- Kiste

### Startinventar und Besitz

Das Modell kann bereits ein einfaches Inventar als Besitzrelation ausdruecken.

Moeglich sind aktuell:

- Startobjekte des Spielers ueber `player.initialInventory`
- Objekte ausserhalb der aktiven Szene ueber `world.offstageObjects`
- eindeutige Startplatzierung pro Objekt

Interpretation:

- Ein Objekt ist zu Beginn entweder in einem Raum, im Inventar oder offstage.
- Inventar ist derzeit kein eigener Objektcontainer mit Slots oder Gewicht.
- Besitz bedeutet nur, dass dasselbe Weltobjekt initial beim Spieler liegt.

### Objektzustand

Objekte koennen einen deklarierten Zustand mit `stateSchema` besitzen.

Moeglich sind aktuell:

- Boolean-Zustaende wie `closed: true/false`
- Enums wie `lightMode: off | dim | bright`
- numerische Werte mit Grenzen wie `fuelLevel: 0..100`
- dokumentierte Initialwerte ueber `default`
- optionale Start-Overrides ueber `state`

Dadurch lassen sich bereits viele klassische Adventure-Zustaende ausdruecken.

Typische Beispiele:

- offen / geschlossen
- an / aus
- verriegelt / entriegelt
- Brennstoffstand
- Ladungsstand
- Fortschrittszaehler

### Objektinteraktionen

Das Modell unterstuetzt konkrete Spielerhandlungen an Objekten.

Moeglich sind aktuell:

- Betrachtungsaktionen
- Oeffnen und Schliessen
- objektspezifische Einzelaktionen
- sprachliche Varianten ueber `aliases`
- semantische Einordnung ueber `interactionTypes`

Wichtig dabei:

- Die eigentliche Spiellogik steckt nicht im Interaktionstyp allein.
- Das Verhalten entsteht aus Bedingungen, Effekten und Resultaten.

### Bedingte Interaktionen

Interaktionen koennen an Bedingungen geknuepft sein.

Moeglich sind aktuell:

- Interaktion nur wenn ein State exakt einen Wert hat
- Interaktion nur wenn ein Array einen Marker enthaelt
- mehrere Bedingungen gleichzeitig ueber `all`
- Alternativen ueber `any`
- Negation ueber `not`

Dadurch lassen sich klassische Freischaltlogiken modellieren.

Typische Beispiele:

- Tuer nur oeffnen, wenn sie geschlossen ist
- Lampe nur einschalten, wenn sie aus ist
- Passage nur betreten, wenn ein Mechanismus aktiviert wurde

### Weltveraenderungen

Interaktionen und Raumereignisse koennen die Welt veraendern.

Moeglich sind aktuell:

- State-Werte setzen ueber `set`
- unmittelbare Zusatztexte ueber `say`
- Engine-Hooks ueber `trigger`

Das reicht bereits fuer viele einfache Zustandsuebergaenge.

Typische Beispiele:

- `closed` von `true` auf `false` setzen
- eine Meldung wie "Die Tuer quietscht laut auf" ausgeben
- ein benanntes Event fuer Speziallogik ausloesen

### Spielerfeedback

Jede Interaktion kann ein direktes Ergebnis zurueckgeben.

Moeglich sind aktuell:

- reiner Antworttext
- Wissensmarker ueber `knowledge`

Damit lassen sich sowohl sichtbare Reaktionen als auch semantische Merkpunkte ablegen.

Typische Beispiele:

- Beschreibungsfeedback
- Erfolgs- oder Misserfolgstexte
- Marker wie "spieler weiss jetzt, dass die Tuer alt ist"

### Raumgebundene Objektkomposition

Weil Raeume Objekte referenzieren, lassen sich Szenen komponieren.

Moeglich sind aktuell:

- derselbe Raum mit charakteristischen Objekten
- unterschiedliche Interaktionsdichte pro Raum
- sichtbare Szenenwechsel durch andere Objektmengen

Das eignet sich gut fuer:

- Erkundung
- kleine Adventure-Szenen
- Audio- oder Textspiel-Setups mit klarer Ortsbindung

### Raumatmosphaere ueber Objekte

Raumbezogene Zustaende werden aktuell nicht ueber einen eigenen Raum-State modelliert, sondern ueber Objekte im oder am Raum.

Das koennen sichtbare Dinge sein:

- Laterne
- Lichtschalter
- Generator
- Nebelquelle

Oder implizite Systemobjekte:

- `huetteInnenLicht`
- `kellerAtmosphaere`
- `torMechanismus`

Damit lassen sich auch abstraktere Raumeffekte ausdruecken, ohne ein zweites Zustandsmodell fuer Raeume einzufuehren.

## Gut passende Genres und Muster

Mit dem aktuellen Modell lassen sich besonders gut bauen:

- klassische Text-Adventures
- Audio-Adventures mit sprachlichen Synonymen
- Escape-Room-artige Mikroszenen
- kleine Puzzleketten auf Basis von Objektzustand
- explorative Worlds mit beschreibbaren Orten und wenigen, klaren Aktionen

## Bereits erkennbar, aber noch nicht voll ausmodelliert

Einige Spielelemente sind heute teilweise moeglich, aber noch nicht komplett ausgebaut.

### Inventarlogik

Noch nicht explizit modelliert sind:

- Aufheben
- Ablegen
- Besitzwechsel zur Laufzeit
- Ausruestungsslots
- Tragbarkeit als eigene Regel

Das liesse sich spaeter wahrscheinlich ueber zusaetzliche Objekt- oder Spielerzustandsmodelle erweitern.

### NPCs und Dialoge

Grundsaetzlich koennen NPCs als Objekte modelliert werden, aber es fehlen noch eigene Strukturen fuer:

- Dialogbaeume
- Rollen
- Beziehungen
- Wissensstand pro Figur

### Komplexere Ressourcen und Simulation

Einzelne Werte wie Brennstoff oder Ladung sind schon moeglich. Noch nicht explizit ausgearbeitet sind:

- Zeit
- Hunger
- Gesundheitssysteme
- Kampflogik
- periodische Zustandsaenderungen

### Globale Weltzustandslogik

Der Fokus liegt derzeit auf Objektreferenzen. Noch offen oder spaeter ausbaubar sind:

- globale Flags
- raumweiter Zustand
- systemspezifische Events mit Rueckwirkungen auf viele Objekte

## Kurzfazit

Das aktuelle Modell ist bereits stark genug fuer kleine bis mittlere, zustandsbasierte Adventure-Welten.

Besonders gut passt es fuer:

- Orte
- Objekte
- Navigation
- Bedingungen
- Zustandswechsel
- sprachnahe Interaktionen
- einfachen Startbesitz

Noch nicht im Zentrum stehen dagegen Inventar zur Laufzeit, NPC-Dialogsysteme und umfassende globale Simulation.
