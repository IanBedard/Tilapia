export type Role = "user" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  githubConnected: boolean;
};

export type FishingPin = {
  id: string;
  spotName: string;
  waterbody: string;
  city: string;
  fishCaught: string;
  notes: string;
  caughtAt: string;
  x: number;
  y: number;
  createdBy: string;
};
