import type { FishingPin, User } from "./types";

const SESSION_KEY = "tilapia.session";
const PINS_KEY = "tilapia.pins";

const seedPins: FishingPin[] = [
  {
    id: "seed-dow",
    spotName: "Dow's Lake Shoreline",
    waterbody: "Rideau Canal",
    city: "Ottawa",
    fishCaught: "Smallmouth bass, sunfish",
    notes: "Good access from the pathway. Watch seasonal canal rules.",
    caughtAt: "2026-06-12",
    x: 47,
    y: 58,
    createdBy: "system",
  },
  {
    id: "seed-petrie",
    spotName: "Petrie Island",
    waterbody: "Ottawa River",
    city: "Orleans",
    fishCaught: "Pike, perch",
    notes: "Popular family spot with nearby parking.",
    caughtAt: "2026-06-08",
    x: 70,
    y: 38,
    createdBy: "system",
  },
  {
    id: "seed-aylmer",
    spotName: "Aylmer Marina",
    waterbody: "Ottawa River",
    city: "Gatineau",
    fishCaught: "Walleye",
    notes: "Evening bite was strongest near rocky edges.",
    caughtAt: "2026-05-29",
    x: 28,
    y: 35,
    createdBy: "system",
  },
];

export function loadSession(): User | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSession(user: User | null) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function loadPins(): FishingPin[] {
  const raw = localStorage.getItem(PINS_KEY);
  if (!raw) {
    localStorage.setItem(PINS_KEY, JSON.stringify(seedPins));
    return seedPins;
  }
  return JSON.parse(raw);
}

export function savePins(pins: FishingPin[]) {
  localStorage.setItem(PINS_KEY, JSON.stringify(pins));
}
