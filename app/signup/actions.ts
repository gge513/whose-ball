"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  const password = String(formData.get("password") ?? "");

  // Length plus at least one letter and one digit: keeps "12345678" and
  // "password" out without a composition gauntlet nobody remembers.
  if (
    !name ||
    !email ||
    password.length < 8 ||
    !/[a-zA-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    redirect("/signup?error=invalid");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) redirect("/signup?error=exists");

  // Never store the password itself: bcrypt hashes are one-way, salted,
  // and deliberately slow — a database leak does not become a password leak.
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ name, email, passwordHash });

  await signIn("credentials", { email, password, redirectTo: "/me" });
}
