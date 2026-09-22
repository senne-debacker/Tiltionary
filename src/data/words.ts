// src/data/words.js
// Woordpakketten. Woorden zijn expres simpel gehouden: je tekent met een
// rollend balletje, dus details zijn zo goed als onmogelijk.

export const WORD_PACKS = {
  algemeen: {
    label: "Algemeen",
    emoji: "🎲",
    words: [
      "HUIS", "AUTO", "BOOM", "ZON", "MAAN", "STER", "FIETS", "BOOT",
      "TREIN", "VLIEGTUIG", "BRUG", "BERG", "WOLK", "REGEN", "SNEEUWMAN",
      "HART", "SLEUTEL", "KLOK", "PARAPLU", "BALLON", "VLAG", "LADDER",
      "DEUR", "RAAM", "TRAP", "KAARS", "BRIL", "HOED", "SCHOEN", "BED",
      "STOEL", "TAFEL", "LAMP", "BLOEM", "BLAD", "EILAND", "VUURTOREN",
      "RAKET", "ROBOT", "SPOOK",
    ],
  },
  dieren: {
    label: "Dieren",
    emoji: "🐙",
    words: [
      "KAT", "HOND", "VIS", "VOGEL", "SLANG", "OLIFANT", "GIRAF", "MUIS",
      "KONIJN", "SCHAAP", "KOE", "VARKEN", "PAARD", "KIP", "EEND", "UIL",
      "BEER", "LEEUW", "TIJGER", "AAP", "PINGUIN", "WALVIS", "HAAI",
      "KRAB", "OCTOPUS", "SPIN", "MIER", "BIJ", "VLINDER", "KIKKER",
      "SCHILDPAD", "SLAK", "EGEL", "VOS", "WOLF", "ZEBRA", "KAMEEL",
      "DOLFIJN", "KWAL", "WORM",
    ],
  },
  eten: {
    label: "Eten",
    emoji: "🍕",
    words: [
      "APPEL", "BANAAN", "PEER", "DRUIF", "AARDBEI", "KERS", "CITROEN",
      "WORTEL", "PATAT", "PIZZA", "TAART", "KOEK", "BROOD", "KAAS",
      "EI", "MELK", "IJSJE", "SNOEP", "LOLLY", "DONUT", "HAMBURGER",
      "HOTDOG", "PANNENKOEK", "WAFEL", "SOEP", "FRIKANDEL", "KROKET",
      "STOKBROOD", "PAPRIKA", "UI", "TOMAAT", "CHAMPIGNON", "MAIS",
      "RIJST", "SPAGHETTI", "CHOCOLADE", "POPCORN", "THEE", "KOFFIE",
      "WATERMELOEN",
    ],
  },
  voorwerpen: {
    label: "Voorwerpen",
    emoji: "🔧",
    words: [
      "HAMER", "ZAAG", "SCHAAR", "POTLOOD", "PEN", "BOEK", "TELEFOON",
      "LAPTOP", "MUIS", "TOETSENBORD", "BEKER", "BORD", "VORK", "MES",
      "LEPEL", "PAN", "FLES", "EMMER", "BEZEM", "SPIEGEL", "KAM",
      "TANDENBORSTEL", "ZEEP", "HANDDOEK", "KOFFER", "RUGZAK", "TENT",
      "KOMPAS", "VERREKIJKER", "CAMERA", "GITAAR", "TROMMEL", "PIANO",
      "VOETBAL", "SKATEBOARD", "SKI", "ANKER", "KROON", "ZWAARD", "SCHILD",
    ],
  },
};

export const DEFAULT_PACK = "algemeen";

export const PACK_KEYS = Object.keys(WORD_PACKS);

/**
 * Kies `count` willekeurige woorden uit een pakket.
 * Woorden die al gebruikt zijn in dit spel worden overgeslagen; is het pakket
 * op, dan beginnen we gewoon opnieuw met de volledige lijst.
 */
export function pickWords(packKey, usedWords = {}, count = 3) {
  const pack = WORD_PACKS[packKey] || WORD_PACKS[DEFAULT_PACK];
  let pool = pack.words.filter((w) => !usedWords[w]);

  if (pool.length < count) pool = [...pack.words];

  const chosen = [];
  const remaining = [...pool];
  while (chosen.length < count && remaining.length > 0) {
    const i = Math.floor(Math.random() * remaining.length);
    chosen.push(remaining[i]);
    remaining.splice(i, 1);
  }
  return chosen;
}
