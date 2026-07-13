// The six-stage trajectory, in order. Shared by UI and server actions;
// lives outside the "use server" boundary because action files may only
// export async functions.
export const STAGE_ORDER = [
  "define",
  "commit",
  "build",
  "verify",
  "ship",
  "teach",
] as const;
export type Stage = (typeof STAGE_ORDER)[number];
