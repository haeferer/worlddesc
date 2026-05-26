# __DISPLAY_NAME__ Agent Notes

Dieses Projekt trennt bewusst zwischen harter Weltlogik und narrativer Regie.

## Kanonische Dateien

- `world/main.world.yaml` ist die harte Weltwahrheit.
- `world/guides/*.narrative-guide.yaml` enthalten nur Regie, Ton und semantische Hinweise.
- `world/prompts/project-guide.character.txt` steuert den sprachlichen Begleiter, nicht die Weltlogik.
- `docs/character-guide.md` haelt fest, wie der Begleiter klingen und was er bevorzugen soll.

## Arbeitsregeln

- Neue Fakten, Objekte, Raeume und Interaktionen gehoeren in die World-Datei.
- Stimmung, sensorische Leitplanken und Ton gehoeren in Narrative Guides.
- Stimme, Fuehrungsstil und Redundanzregeln gehoeren in Prompt-Datei plus Character-Guide, nicht in die World.
- Versteckte Weltregeln, Locks oder Konsequenzen duerfen nicht nur in Guides oder Promptdateien auftauchen.
- Nach Aenderungen an der World immer `npm run checkworld` ausfuehren.

## Typischer Ablauf

1. Projektziel in `docs/project-intent.md` lesen oder schaerfen.
2. World-Struktur in `world/main.world.yaml` aendern.
3. Narrative Guide in `world/guides/` angleichen.
4. Character-Stimme in `world/prompts/` und `docs/character-guide.md` angleichen.
5. Mit `npm run checkworld` pruefen.
