export type Role = "user" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  githubConnected: boolean;
  status: "active" | "suspended";
  joinedAt: string;
};

export type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

export type PinPhoto = {
  id: string;
  src: string;
  caption: string;
};

export type Rating = {
  id: string;
  userEmail: string;
  value: number;
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
  ratings: Rating[];
  comments: Comment[];
  photos: PinPhoto[];
};
