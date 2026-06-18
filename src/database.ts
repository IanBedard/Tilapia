import { supabase } from "./supabaseClient";
import { loadPins, loadUsers, savePins, saveUsers } from "./storage";
import type { FishingPin, User } from "./types";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  github_connected: boolean;
  status: User["status"];
  joined_at: string;
};

type PinRow = {
  id: string;
  spot_name: string;
  waterbody: string;
  city: string;
  fish_caught: string;
  notes: string;
  caught_at: string;
  x: number;
  y: number;
  longitude: number;
  latitude: number;
  created_by: string;
  ratings: FishingPin["ratings"];
  comments: FishingPin["comments"];
  photos: FishingPin["photos"];
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    githubConnected: row.github_connected,
    status: row.status,
    joinedAt: row.joined_at,
  };
}

function fromUser(user: User): UserRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    github_connected: user.githubConnected,
    status: user.status,
    joined_at: user.joinedAt,
  };
}

function toPin(row: PinRow): FishingPin {
  return {
    id: row.id,
    spotName: row.spot_name,
    waterbody: row.waterbody,
    city: row.city,
    fishCaught: row.fish_caught,
    notes: row.notes,
    caughtAt: row.caught_at,
    x: Number(row.x),
    y: Number(row.y),
    longitude: Number(row.longitude),
    latitude: Number(row.latitude),
    createdBy: row.created_by,
    ratings: row.ratings ?? [],
    comments: row.comments ?? [],
    photos: row.photos ?? [],
  };
}

function fromPin(pin: FishingPin): PinRow {
  return {
    id: pin.id,
    spot_name: pin.spotName,
    waterbody: pin.waterbody,
    city: pin.city,
    fish_caught: pin.fishCaught,
    notes: pin.notes,
    caught_at: pin.caughtAt,
    x: pin.x,
    y: pin.y,
    longitude: pin.longitude,
    latitude: pin.latitude,
    created_by: pin.createdBy,
    ratings: pin.ratings,
    comments: pin.comments,
    photos: pin.photos,
  };
}

export async function loadAppData() {
  if (!supabase) {
    return {
      pins: loadPins(),
      users: loadUsers(),
      source: "local" as const,
    };
  }

  const [{ data: pinRows, error: pinsError }, { data: userRows, error: usersError }] = await Promise.all([
    supabase.from("fishing_pins").select("*").order("caught_at", { ascending: false }),
    supabase.from("app_users").select("*").order("joined_at", { ascending: false }),
  ]);

  if (pinsError || usersError) {
    console.warn("Supabase load failed, using local cache.", pinsError ?? usersError);
    return {
      pins: loadPins(),
      users: loadUsers(),
      source: "local" as const,
    };
  }

  const pins = pinRows?.length ? (pinRows as PinRow[]).map(toPin) : loadPins();
  const users = userRows?.length ? (userRows as UserRow[]).map(toUser) : loadUsers();
  savePins(pins);
  saveUsers(users);

  if (!pinRows?.length) await saveRemotePins(pins);
  if (!userRows?.length) await saveRemoteUsers(users);

  return { pins, users, source: "supabase" as const };
}

export async function saveRemotePins(pins: FishingPin[]) {
  savePins(pins);
  if (!supabase) return;
  const { error } = await supabase.from("fishing_pins").upsert(pins.map(fromPin));
  if (error) throw error;
}

export async function saveRemoteUsers(users: User[]) {
  saveUsers(users);
  if (!supabase) return;
  const { error } = await supabase.from("app_users").upsert(users.map(fromUser));
  if (error) throw error;
}

export async function deleteRemotePin(id: string) {
  if (!supabase) return;
  const { error } = await supabase.from("fishing_pins").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteRemoteUser(email: string) {
  if (!supabase) return;
  const { error } = await supabase.from("app_users").delete().eq("email", email);
  if (error) throw error;
}
