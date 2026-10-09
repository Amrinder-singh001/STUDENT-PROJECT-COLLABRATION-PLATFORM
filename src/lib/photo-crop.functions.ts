import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CropSuggestion {
  centerX: number;
  centerY: number;
  size: number;
  reason: string;
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["centerX", "centerY", "size", "reason"],
  properties: {
    centerX: { type: "number", description: "Horizontal centre of the square crop, 0 (left) to 1 (right) of image width" },
    centerY: { type: "number", description: "Vertical centre of the square crop, 0 (top) to 1 (bottom) of image height" },
    size: { type: "number", description: "Square side as a fraction of the image's shorter side, 0.2 to 1" },
    reason: { type: "string", description: "One short sentence describing the framing" },
  },
};

export const suggestPhotoCrop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) =>
    z.object({ image: z.string().startsWith("data:image/").max(3_000_000) }).parse(input),
  )
  .handler(async ({ data }): Promise<CropSuggestion> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Photo suggestions aren't configured yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        text: { format: { type: "json_schema", name: "crop", strict: true, schema } },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Suggest a square profile-photo crop. Centre the person's face slightly above the middle, include head and shoulders with comfortable headroom, and avoid cutting off the chin or top of the head. If there is no person, frame the main subject clearly.",
              },
              { type: "input_image", image_url: data.image },
            ],
          },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      if (res.status === 429) throw new Error("Too many requests right now. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits have run out for this workspace.");
      throw new Error("Couldn't get a suggestion for this photo.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let refused = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload);
          if (event.type === "response.output_text.delta") text += event.delta ?? "";
          if (event.type === "response.refusal.delta") refused = true;
          if (event.type === "error" || event.type === "response.failed") refused = true;
        } catch {
          /* partial frame */
        }
      }
    }
    if (refused || !text) throw new Error("Couldn't get a suggestion for this photo.");

    const parsed = JSON.parse(text) as CropSuggestion;
    const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Number(n) || 0));
    return {
      centerX: clamp(parsed.centerX, 0, 1),
      centerY: clamp(parsed.centerY, 0, 1),
      size: clamp(parsed.size, 0.2, 1),
      reason: String(parsed.reason ?? "").slice(0, 200),
    };
  });
