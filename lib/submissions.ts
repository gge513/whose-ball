import { promises as fs } from "fs";
import path from "path";

/**
 * Load cohort submission JSONs. Per-file try/catch so one malformed file is
 * skipped, never blanking the console (spec-flow MUST). Mirrors the contest
 * schema; the demo reads a snapshot under data/submissions.
 */

export type Submission = {
  githubHandle: string;
  name?: string;
  photoUrl?: string;
  repoUrl?: string;
  liveUrl?: string;
  loomUrl?: string;
  pitch?: string;
  competeForWin?: boolean;
};

export async function loadSubmissions(): Promise<Submission[]> {
  const dir = path.join(process.cwd(), "data", "submissions");
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const subs: Submission[] = [];
  for (const f of files) {
    try {
      const raw = await fs.readFile(path.join(dir, f), "utf-8");
      const data = JSON.parse(raw) as Submission;
      if (data && typeof data.githubHandle === "string") subs.push(data);
    } catch {
      // skip malformed; render the rest
    }
  }
  return subs;
}

/** Only entries explicitly trying to win are votable (strict === true). */
export function competing(subs: Submission[]): Submission[] {
  return subs.filter((s) => s.competeForWin === true);
}
