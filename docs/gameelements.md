# Game Elements

Dieses Dokument beschreibt nicht die technische Struktur des Schemas, sondern die Spielelemente, die sich mit dem aktuellen World-Modell bereits ausdruecken lassen.

## Aktuell gut abbildbare Spielelemente

### Raeume und Orte

Das Modell kann klar getrennte Orte mit eigener Beschreibung abbilden.

Moeglich sind aktuell:

- Startorte
- Aussen- und Innenraeume
- benannte Zwischenorte
- atmosphaerisch markierte Orte ueber `tags`
- Ortswechsel ueber explizite `ways`

### Platzierte Weltobjekte

Objekte sind globale Instanzen mit einem expliziten Aufenthaltsort.

Moeglich sind aktuell:

- Objekte in Raeumen
- Objekte im Inventar des Spielers
- Objekte ausserhalb der aktiven Szene
- Objekte in anderen Objekten

Dadurch lassen sich bereits ausdruecken:

- Kiste auf der Wiese
- Schluessel in der Kiste
- Laterne in der Huette
- spaeter auftauchende Objekte als offstage

### Einfache Container-Szenen

Durch `placement.<objekt>.object` lassen sich einfache Containerbeziehungen ausdruecken.

Moeglich sind aktuell:

- Schluessel in Kiste
- Brief in Schublade
- Edelstein in Sockel

Noch nicht ausmodelliert ist die allgemeine Laufzeitmechanik dafuer, aber die Weltstruktur selbst ist bereits sauber formulierbar.

### Inventar als Besitzrelation

Das Modell kann ein einfaches Inventar ausdruecken.

Aktuell moeglich:

- ein Objekt startet im Inventar des Spielers
- ein Objekt ist tragbar ueber `portable: true`
- Besitz ist konzeptionell ein Aufenthaltsort, kein separater Gegenstandstyp

### Objektzustand

Objekte koennen einen deklarierten Zustand mit `stateSchema` besitzen.

Moeglich sind aktuell:

- Boolean-Zustaende wie `closed`
- Enums wie `lockState` oder `lightMode`
- numerische Werte mit Grenzen wie `fuelLevel`
- dokumentierte Initialwerte ueber `default`

### Verschlossene und entriegelbare Dinge

Das Modell kann klassische Adventure-Hindernisse bereits gut ausdruecken.

Moeglich sind aktuell:

- geschlossene Tueren
- verriegelte Tueren
- getrennte Zustandsachsen wie `closed` und `lockState`
- separate Interaktionen fuer `entriegeln` und `oeffnen`

### Objektinteraktionen

Das Modell unterstuetzt konkrete Spielerhandlungen an Objekten.

Moeglich sind aktuell:

- Betrachtungsaktionen
- Oeffnen und Schliessen
- Entriegeln
- objektspezifische Einzelaktionen
- sprachliche Varianten ueber `aliases`

### Bedingte Interaktionen

Interaktionen koennen an Bedingungen geknuepft sein.

Moeglich sind aktuell:

- Interaktion nur wenn ein State exakt einen Wert hat
- mehrere Bedingungen gleichzeitig ueber `all`
- Alternativen ueber `any`
- Negation ueber `not`

### Weltveraenderungen

Interaktionen und Raumereignisse koennen die Welt veraendern.

Moeglich sind aktuell:

- State-Werte setzen ueber `set`
- unmittelbare Zusatztexte ueber `say`
- Engine-Hooks ueber `trigger`

### Spielerfeedback

Jede Interaktion kann ein direktes Ergebnis zurueckgeben.

Moeglich sind aktuell:

- reiner Antworttext
- Wissensmarker ueber `knowledge`

## Bereits erkennbar, aber noch nicht voll ausmodelliert

### Laufzeit-Inventarlogik

Noch nicht explizit modelliert sind:

- Aufheben
- Ablegen
- Besitzwechsel zur Laufzeit
- standardisierte Inventarbedingungen

### Laufzeit-Containerlogik

Die Struktur "Objekt in Objekt" ist jetzt vorhanden. Noch nicht als Standardmechanik ausgebaut sind:

- Herausnehmen
- Hineinlegen
- generische Zugaenglichkeitsregeln
- Containerkapazitaeten

### Move-Effekt

Das naechste naheliegende Spielelement ist ein `move`-Effekt fuer Ortswechsel zwischen:

- Raum
- Inventar
- Offstage
- Objekt

## Kurzfazit

Das aktuelle Modell ist bereits stark genug fuer kleine bis mittlere, zustandsbasierte Adventure-Welten mit Containern, tragbaren Objekten und verschlossenen Hindernissen.

Noch nicht im Zentrum stehen dagegen die Laufzeitmechanik von Inventar und Containern.
