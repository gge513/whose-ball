"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";

export async function credentialsSignInAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/me",
    });
  } catch (e) {
    if (e instanceof AuthError) redirect("/signin?error=1");
    throw e; // NEXT_REDIRECT and anything unexpected pass through
  }
}

export async function githubSignInAction() {
  await signIn("github", { redirectTo: "/me" });
}
