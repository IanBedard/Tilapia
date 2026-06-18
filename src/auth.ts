import type { User } from "./types";

const adminEmail = "admin@tilapia.local";
const adminPassword = "admin123";

export function signIn(email: string, password: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = normalizedEmail === adminEmail && password === adminPassword;

  if (!normalizedEmail || password.length < 4) {
    throw new Error("Use an email and a password with at least 4 characters.");
  }

  return {
    id: isAdmin ? "admin" : normalizedEmail,
    name: isAdmin ? "NCR Admin" : normalizedEmail.split("@")[0] || "Angler",
    email: normalizedEmail,
    role: isAdmin ? "admin" : "user",
    githubConnected: false,
  };
}

export const demoAdmin = {
  email: adminEmail,
  password: adminPassword,
};
