# Assets

Der aktuelle Asset-Startpunkt ist bewusst klein: ein Asset ist zunaechst ein isoliertes Objektmodul in einer eigenen Datei.

## Phase 0

- Ein Asset ist noch keine Teilwelt und noch keine Runtime-Sonderlogik.
- Ein Asset ist ein Authoring-Modul, das spaeter in eine World instanziiert werden kann.
- Ein Asset muss schon fuer sich allein valide sein.
- Nach dem spaeteren Einmischen soll daraus wieder normale Weltstruktur werden.

## Dokumentform

Ein Objekt-Asset nutzt aktuell:

- `asset` fuer Metadaten und Root-Objekte
- `interactionTypes` fuer lokale Interaktionstypen
- `objects` fuer die enthaltenen Weltobjekte
- `placement` fuer die interne Platzierung

Beispiel:

```yaml
asset:
  kind: objectAsset
  id: safe
  roots: [safe]
```

## Root-Objekte

- `asset.roots` benennt die Top-Level-Objekte des Assets.
- In Phase 0 muessen Root-Objekte `offstage` platziert sein.
- Nicht-Root-Objekte duerfen in Root- oder Unterobjekten liegen.

Diese Regel haelt die Asset-Validierung klein, solange es noch keine Einbindung in Raeume oder Instanzen gibt.

## Platzierung

Innerhalb eines Assets sind in Phase 0 nur zwei Platzierungsarten erlaubt:

- `offstage: true`
- `object: <objektId>`

`room` und `inventory` sind noch nicht erlaubt, weil Assets aktuell vollstaendig isoliert validiert werden.

## Validierung

- `schema/object-asset.schema.json` prueft die Dokumentform.
- `loadObjectAsset()` prueft zusaetzlich interne Referenzen, State-Pfade und Platzierungszyklen.
- `npm run checkasset` validiert ein Asset von der Kommandozeile aus.

## Beispiel

- [safe.object-asset.yaml](/C:/remoterep/worlddesc/sample/assets/safe.object-asset.yaml:1)
