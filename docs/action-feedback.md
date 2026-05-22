# Action Feedback

Dieses Dokument beschreibt die erste strukturierte Form von Fehlern, Rueckfragen und Eingabehinweisen auf der Player-Schnittstelle.

Der Fokus liegt dabei nicht auf freier Sprache, sondern auf stabilen, maschinenlesbaren Rueckgaben, auf die spaeter ein LLM oder eine UI systematisch reagieren kann.

## Ziel

Die Engine soll nicht nur wissen, dass eine Aktion fehlgeschlagen ist, sondern auch:

- warum sie fehlgeschlagen ist
- ob der Fehler sinnvoll wiederholbar ist
- ob eine Rueckfrage an den Spieler sinnvoll ist
- welche Eingabeform fuer einen neuen Versuch erwartet wird

## Grundidee

Ein Fehlschlag ist nicht nur `accepted: false`, sondern ein strukturiertes Objekt:

- `code`
- `kind`
- `retryable`
- optional `followUp`
- optional `details`

Damit kann eine aufrufende Schicht sehr klar unterscheiden:

- unbekannte Referenz
- aktuell unzugaengliches Objekt
- formell bekannte, aber gerade nicht verfuegbare Aktion
- fehlende Eingabe
- ungueltige Eingabe
- interner Ausfuehrungsfehler

## Aktueller Zuschnitt

### Failure Codes

Aktuell vorgesehen und auf der Player-Sicht bereits nutzbar:

- `unknown-object`
- `unknown-action`
- `object-not-accessible`
- `action-not-available`
- `missing-input`
- `invalid-input`
- `execution-failed`

### Failure Kinds

Die Codes werden grob in groessere Gruppen einsortiert:

- `unknown`
- `availability`
- `input`
- `execution`

Diese zweite Ebene ist spaeter hilfreich fuer LLM oder UI, wenn nicht auf jeden einzelnen Code separat verzweigt werden soll.

## Rueckfrage- und Retry-Semantik

Nicht jeder Fehler ist gleich zu behandeln.

### Nicht sinnvoll wiederholbare Fehler

Typische Faelle:

- `unknown-object`
- `unknown-action`
- viele `action-not-available`-Faelle

Hier ist oft keine direkte Wiederholung sinnvoll. Stattdessen braucht die aufrufende Schicht eher:

- Umformulierung
- neue Objektwahl
- andere Aktion

### Sinnvoll wiederholbare Fehler

Typische Faelle:

- `missing-input`
- `invalid-input`

Hier ist ein neuer Versuch meist sinnvoll. Deshalb tragen diese Fehler aktuell:

- `retryable: true`
- ein `followUp`
- die erwartete Eingabeform

## Follow-Up-Struktur

Fuer eingabebezogene Fehler kann die Schnittstelle eine direkte Rueckfragehilfe liefern:

- `provide-input`
- `correct-input`

Beispiele:

- `Please provide a text value for "codeEingeben".`
- `Please choose one of the declared options for "modusWaehlen".`
- `Please provide a valid numeric value within the declared range for "temperaturSetzen".`

Wichtig:

- diese Texte sind derzeit bewusst knapp und technisch
- spaeter kann ein LLM sie fuer den Menschen atmosphaerischer oder freundlicher vermitteln
- die Engine bleibt dabei die deterministische Quelle der Rueckfragebedeutung

## Input-Details

Bei `missing-input` und `invalid-input` werden zusaetzlich Details geliefert:

- `expectedInput`
- optional `providedValue`
- bei `select` optional `allowedValues`
- bei `number` optional `min`, `max`, `step`

Das ist besonders wichtig fuer den spaeteren LLM-Einsatz:

- das LLM muss nicht raten, welche Form ein neuer Versuch haben sollte
- die Engine beschreibt das formale Problem bereits selbst

## Was aktuell noch offen ist

Der aktuelle Stand ist bewusst ein erster kleiner Schnitt.

Noch offen oder spaeter ausbaubar:

- getrennte Codes fuer `known-but-not-visible` und `known-but-not-accessible`
- echte Rueckfragekandidaten fuer Mehrdeutigkeiten auch auf `performAction()`-Ebene
- Fehler fuer fehlendes `object2` in der breiteren Intent-Grammatik
- explizite Kennzeichnung von "formal verstanden, aber in dieser Welt unsinnig"
- Engine-seitige lustige Fehlreaktionen als eigener Rueckgabetyp

## Rolle fuer den spaeteren LLM-Schritt

Dieses Protokoll ist eine der wichtigsten Vorbedingungen fuer einen ersten LLM-Versuch.

Warum:

- das LLM soll nicht improvisieren muessen, wenn etwas nicht klappt
- es soll systematisch nachfragen, neu versuchen oder umplanen koennen
- die Engine bleibt dabei die Quelle der formalen Wahrheit

Kurz:

- die Engine liefert die klare Fehlerstruktur
- das LLM liefert spaeter die gute sprachliche Vermittlung dazu
