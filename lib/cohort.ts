import { promises as fs } from "fs";
import path from "path";
import type { CohortMember } from "@/lib/github";

/**
 * Load the cohort member list. Configurable source (plan): a seed JSON for the
 * demo; the real cohort org plugs in here later. Reads from disk so it works in
 * every runtime without bundling assumptions.
 */
export async function loadCohort(): Promise<CohortMember[]> {
  try {
    const file = path.join(process.cwd(), "data", "cohort.json");
    const raw = await fs.readFile(file, "utf-8");
    const data = JSON.parse(raw) as { members?: CohortMember[] };
    return Array.isArray(data.members) ? data.members : [];
  } catch {
    return [];
  }
}
