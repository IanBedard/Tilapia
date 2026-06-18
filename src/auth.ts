import type { Role, User } from "./types";
import { adminUser, loadUsers, saveUsers } from "./storage";

const adminEmail = "admin@tilapia.local";
const adminPassword = "admin123";

export function signIn(email: string, password: string): User {
  const normalizedEmail = email.trim().toLowerCase();
  const isAdmin = normalizedEmail === adminEmail && password === adminPassword;

  if (!normalizedEmail || password.length < 4) {
    throw new Error("Use an email and a password with at least 4 characters.");
  }

  const users = loadUsers();
  const existing = users.find((user) => user.email === normalizedEmail);

  if (existing?.status === "suspended") {
    throw new Error("This account has been suspended by an admin.");
  }

  const nextUser: User = existing ?? {
    ...(isAdmin ? adminUser : {
      id: normalizedEmail,
      name: normalizedEmail.split("@")[0] || "Angler",
      email: normalizedEmail,
      role: "user",
      githubConnected: false,
      status: "active",
      joinedAt: new Date().toISOString().slice(0, 10),
    }),
  };

  const savedUser: User = {
    ...nextUser,
    email: normalizedEmail,
    role: (isAdmin ? "admin" : "user") satisfies Role,
  };

  if (!existing) {
    saveUsers([savedUser, ...users.filter((user) => user.email !== savedUser.email)]);
  }

  return savedUser;
}

export const demoAdmin = {
  email: adminEmail,
  password: adminPassword,
};
