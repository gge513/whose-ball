import Anthropic from "@anthropic-ai/sdk";

/**
 * Single-shot "what I shipped this week" draft from structured PR data.
 * Additive layer (plan Decision 4 + 6): plain @anthropic-ai/sdk, model
 * claude-haiku-4-5, NOT the Agent SDK. Degrades gracefully: no key, an error,
 * or a timeout returns a deterministic fallback with `fallback: true`, never a
 * 500, so posting is never blocked by the LLM.
 */

type PR = { title: string; repo: string; url: string };

const TIMEOUT_MS = 15000;

function deterministic(prs: PR[]): string {
  if (prs.length === 0) return "No merged PRs this week.";
  return (
    `This week I shipped ${prs.length} change${prs.length === 1 ? "" : "s"}: ` +
    prs.map((p) => p.title).join("; ") +
    "."
  );
}

export async function POST(req: Request) {
  let prs: PR[] = [];
  try {
    const body = (await req.json()) as { prs?: PR[] };
    prs = Array.isArray(body.prs) ? body.prs : [];
  } catch {
    prs = [];
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ text: deterministic(prs), fallback: true });
  }

  try {
    const client = new Anthropic();
    const msg = await client.messages.create(
      {
        model: "claude-haiku-4-5",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content:
              `Write a short, first-person "what I shipped this week" update ` +
              `(3 to 4 sentences, upbeat but factual, no hype, no em-dashes) ` +
              `from these merged pull requests:\n\n` +
              prs.map((p) => `- ${p.title} (${p.repo})`).join("\n"),
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    const text =
      msg.content.find((b) => b.type === "text")?.text?.trim() ??
      deterministic(prs);
    return Response.json({ text, fallback: false });
  } catch {
    return Response.json({ text: deterministic(prs), fallback: true });
  }
}
