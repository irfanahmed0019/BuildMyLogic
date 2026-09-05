const ENDPOINT = "https://api.sarvam.ai/v1/chat/completions";

export type Msg = { role: "system" | "user" | "assistant"; content: string };

type SarvamResponse = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: { content?: string | null; reasoning_content?: string | null };
  }>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

export async function sarvamChat(apiKey: string, messages: Msg[], maxTokens = 800): Promise<string> {
  const attempts = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": apiKey.trim(),
        },
        body: JSON.stringify({
          model: process.env.SARVAM_MODEL?.trim() || "sarvam-105b",
          messages,
          temperature: 0.1,
          max_tokens: maxTokens,
          reasoning_effort: null,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      const rawBody = await res.text().catch(() => "");
      if (!res.ok) {
        const safeMessage = `Sarvam AI error ${res.status}`;
        if (isRetryableStatus(res.status) && attempt < attempts - 1) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        throw new Error(`${safeMessage}. Please try again.`);
      }

      let json: SarvamResponse;
      try {
        json = JSON.parse(rawBody) as SarvamResponse;
      } catch {
        throw new Error("Sarvam AI returned an invalid response. Please try again.");
      }

      const choice = json.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content === "string" && content.trim()) return content.trim();

      if (choice?.finish_reason === "length" && attempt < attempts - 1) {
        await sleep(350);
        continue;
      }
      throw new Error(
        choice?.finish_reason === "length"
          ? "Vibe's response was cut off. Please try again."
          : "Vibe returned an empty answer. Please try again.",
      );
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && error.name === "AbortError") {
        if (attempt < attempts - 1) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
        throw new Error("Vibe took too long to respond. Please try again.");
      }
      if (error instanceof Error && error.message.startsWith("Sarvam AI error")) throw error;
      if (attempt < attempts - 1) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.message) {
    throw new Error(`Vibe could not reach Sarvam right now. ${lastError.message}`);
  }
  throw new Error("Vibe could not respond right now. Please try again.");
}

function stripFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? text).trim();
}

export function parseJsonBlock<T>(text: string): T {
  const body = stripFence(text);
  try {
    return JSON.parse(body) as T;
  } catch {
    for (let i = 0; i < body.length; i += 1) {
      if (body[i] !== "{" && body[i] !== "[") continue;
      try {
        return JSON.parse(body.slice(i)) as T;
      } catch {
        // Keep looking for a valid JSON boundary.
      }
    }
  }
  throw new Error("Vibe returned an unreadable answer. Please try again.");
}

export async function sarvamJson<T>(apiKey: string, system: string, user: string, maxTokens = 1200): Promise<T> {
  const raw = await sarvamChat(
    apiKey,
    [
      { role: "system", content: `${system}\n\nReturn a JSON object only. No markdown fences. No prose outside JSON.` },
      { role: "user", content: user },
    ],
    maxTokens,
  );
  return parseJsonBlock<T>(raw);
}
