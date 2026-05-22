import type { PlayerActionOptionView } from "./types.js";
import type { PlayerIntentVerbId, PlayerIntentVerbView } from "./intentTypes.js";

const CANONICAL_INTENT_VERBS: readonly PlayerIntentVerbView[] = [
  {
    id: "go",
    title: "Gehen",
    desc: "Sich in eine Richtung oder zu einem bekannten Ziel bewegen.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: false
  },
  {
    id: "examine",
    title: "Ansehen",
    desc: "Etwas genauer betrachten oder untersuchen.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: false
  },
  {
    id: "open",
    title: "Oeffnen",
    desc: "Etwas oeffnen oder aufmachen.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: false
  },
  {
    id: "close",
    title: "Schliessen",
    desc: "Etwas wieder schliessen.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: false
  },
  {
    id: "take",
    title: "Nehmen",
    desc: "Ein Objekt aufnehmen oder an sich nehmen.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: false
  },
  {
    id: "unlock",
    title: "Entriegeln",
    desc: "Etwas aufschliessen oder entriegeln, eventuell mit einem zweiten Objekt.",
    allowsObject1: true,
    allowsObject2: true,
    allowsInput: false
  },
  {
    id: "use",
    title: "Benutzen",
    desc: "Ein Objekt allgemein verwenden oder mit einem zweiten kombinieren.",
    allowsObject1: true,
    allowsObject2: true,
    allowsInput: false
  },
  {
    id: "put",
    title: "Legen",
    desc: "Ein Objekt an oder in ein anderes Ziel legen.",
    allowsObject1: true,
    allowsObject2: true,
    allowsInput: false
  },
  {
    id: "toggle",
    title: "Betaetigen",
    desc: "Einen Schalter umlegen, etwas ein- oder ausschalten oder einstellen.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: false
  },
  {
    id: "read",
    title: "Lesen",
    desc: "Schrift oder Zeichen auf einem Objekt lesen.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: false
  },
  {
    id: "input",
    title: "Eingeben",
    desc: "Einen strukturierten Wert wie Text, Auswahl oder Zahl eingeben.",
    allowsObject1: true,
    allowsObject2: false,
    allowsInput: true
  }
] as const;

const INTERACTION_TYPE_TO_VERB: Readonly<Record<string, PlayerIntentVerbId>> = {
  examine: "examine",
  open: "open",
  close: "close",
  take: "take",
  unlock: "unlock",
  toggle: "toggle",
  input: "input"
};

export function listCanonicalIntentVerbs(): PlayerIntentVerbView[] {
  return CANONICAL_INTENT_VERBS.map((verb) => ({
    ...verb,
    sourceActionIds: []
  }));
}

export function inferCanonicalIntentVerb(action: PlayerActionOptionView): PlayerIntentVerbId {
  if (action.kind === "way") {
    return "go";
  }

  const keywordSource = `${action.actionId} ${action.title}`.toLocaleLowerCase("de-DE");

  if (keywordSource.includes("les")) {
    return "read";
  }

  if (keywordSource.includes("benutz") || keywordSource.includes("verwend") || keywordSource.includes("kombin")) {
    return "use";
  }

  if (
    keywordSource.includes("umleg") ||
    keywordSource.includes("einschalt") ||
    keywordSource.includes("ausschalt") ||
    keywordSource.includes("anmach")
  ) {
    return "toggle";
  }

  if (keywordSource.includes("leg") || keywordSource.includes("steck") || keywordSource.includes("stell")) {
    return action.input ? "input" : "put";
  }

  if (action.input) {
    return "input";
  }

  const typedVerb = action.interactionType ? INTERACTION_TYPE_TO_VERB[action.interactionType] : undefined;
  if (typedVerb) {
    return typedVerb;
  }

  return "use";
}
