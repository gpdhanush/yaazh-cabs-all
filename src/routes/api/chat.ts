import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are "Yaazhi", the friendly booking assistant for Yaazh Cabs, a taxi service based in Udumalpet, Tamil Nadu (running since 2015).

Facts you can use:
- Services: airport taxi (Coimbatore International), one-way, round trip, local hourly rental, corporate travel, and tour packages (Ooty, Kodaikanal, Valparai, Munnar).
- Fleet and per-km rates: Dzire ₹14/km (4 seats), Ertiga ₹18/km (6 seats), Innova ₹20/km (7 seats), SUV ₹23/km (7 seats), Tempo Traveller ₹28/km (14 seats). Base fares: ₹300 / ₹400 / ₹500 / ₹600 / ₹900.
- Fare = base fare + (km × per-km rate). Tolls, parking, permits and driver bata are extra, billed at actuals.
- One-way trips are charged only for the distance travelled.
- Available 24×7. Phone: 93600 55761 and 63690 22364.
- Bookings can be made from the booking form on the site; status can be tracked on the /status page using the booking reference.

Style: warm, brief (2-4 sentences), plain English, rupee amounts in ₹. Give fare estimates when asked, and state they are indicative.
If the user wants to talk to a person, confirm a booking, or asks something you don't know, tell them to tap the "Chat on WhatsApp" button or call 93600 55761. Never invent driver names, availability or exact arrival times.`;

const FALLBACK_REPLY =
  "Our AI assistant isn't connected right now. Please tap Chat on WhatsApp or call 93600 55761 — we're happy to help with your booking.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        const incoming = Array.isArray(body.messages) ? (body.messages as ChatMessage[]) : null;
        if (!incoming) {
          return Response.json({ error: "messages are required" }, { status: 400 });
        }

        const messages = incoming
          .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
          .slice(-14)
          .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

        const key = process.env["AI_API_KEY"] || process.env["OPENAI_API_KEY"];
        if (!key) {
          return Response.json({ reply: FALLBACK_REPLY });
        }

        const base = (process.env["AI_BASE_URL"] || "https://api.openai.com/v1").replace(/\/$/, "");
        const model = process.env["AI_MODEL"] || "gpt-4o-mini";

        const res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(`AI gateway error [${res.status}]: ${text}`);
          if (res.status === 429) {
            return Response.json(
              { error: "Too many messages right now. Please try again in a minute." },
              { status: 429 },
            );
          }
          return Response.json({ reply: FALLBACK_REPLY });
        }

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const reply = data.choices?.[0]?.message?.content?.trim();
        return Response.json({
          reply: reply || FALLBACK_REPLY,
        });
      },
    },
  },
});
