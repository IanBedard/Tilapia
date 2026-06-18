import type { FishingPin, User } from "./types";

const SESSION_KEY = "tilapia.session";
const PINS_KEY = "tilapia.pins";
const USERS_KEY = "tilapia.users";

export const adminUser: User = {
  id: "admin",
  name: "NCR Admin",
  email: "admin@tilapia.local",
  role: "admin",
  githubConnected: false,
  status: "active",
  joinedAt: "2026-06-18",
};

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
    ratings: [
      { id: "rating-dow-1", userEmail: "system", value: 4 },
      { id: "rating-dow-2", userEmail: "local-guide@tilapia.local", value: 5 },
    ],
    comments: [
      {
        id: "comment-dow-1",
        author: "local-guide@tilapia.local",
        body: "Easy walk-in spot and reliable panfish action near sunset.",
        createdAt: "2026-06-12",
      },
    ],
    photos: [
      {
        id: "photo-dow-1",
        src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
        caption: "Canal shoreline",
      },
    ],
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
    ratings: [{ id: "rating-petrie-1", userEmail: "system", value: 3 }],
    comments: [
      {
        id: "comment-petrie-1",
        author: "system",
        body: "Great public access, but it gets busy on warm weekends.",
        createdAt: "2026-06-08",
      },
    ],
    photos: [
      {
        id: "photo-petrie-1",
        src: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=900&q=80",
        caption: "River edge",
      },
    ],
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
    ratings: [{ id: "rating-aylmer-1", userEmail: "system", value: 2 }],
    comments: [],
    photos: [
      {
        id: "photo-aylmer-1",
        src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
        caption: "Rocky shoreline",
      },
    ],
  },
];

function normalizePin(pin: FishingPin): FishingPin {
  return {
    ...pin,
    ratings: pin.ratings ?? [],
    comments: pin.comments ?? [],
    photos: pin.photos ?? [],
  };
}

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
  return JSON.parse(raw).map(normalizePin);
}

export function savePins(pins: FishingPin[]) {
  localStorage.setItem(PINS_KEY, JSON.stringify(pins));
}

export function loadUsers(): User[] {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify([adminUser]));
    return [adminUser];
  }
  const users = JSON.parse(raw) as User[];
  return users.map((user) => ({
    ...user,
    status: user.status ?? "active",
    joinedAt: user.joinedAt ?? new Date().toISOString().slice(0, 10),
  }));
}

export function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
