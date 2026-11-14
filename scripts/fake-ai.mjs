// Fake AI server for tests. Answers like Cloudflare Workers AI and the Claude Messages API.
// Run: node scripts/fake-ai.mjs 4011   then set AI_BASE_URL=http://localhost:4011
// Words in the prompt pick the behaviour: BADJSON (not JSON), SLOWAI (25s, past the timeout),
// LICENCE (asks for "agree" once), MADEUP (search answer with fake trade and area).
import http from "node:http";

const port = Number(process.argv[2] ?? 4011);
let calls = 0;
let agreed = false;

function answer(system, prompt) {
  if (prompt.includes("BADJSON")) return "Sorry, I cannot help with that today.";
  if (system.includes("TASK: writer"))
    return `Here you go: ${JSON.stringify({
      name: "Zobo drink with ginger, 1 litre bottle, fresh every Saturday morning for you",
      about: "Fresh <b>zobo</b> made with ginger and no sugar. Call 0801 234 5678 or visit https://example.com. Made by a member of The Church of Jesus Christ of Latter-day Saints.",
      tags: ["zobo", "drink", "ginger", "hibiscus", "no sugar", "sixth tag"],
      category: "food",
      included: ["Checking the unit", "Cleaning the filters", "Gas top-up if needed", "A short report", "A fifth line"],
    })}`;
  if (system.includes("TASK: post")) {
    const v = /Version (\d)/.exec(prompt)?.[1] ?? "1";
    const pidgin = (system + prompt).includes("Pidgin");
    return JSON.stringify({ text: pidgin ? `(v${v}) Zobo don land! Cold and fresh. #zobo #lagos` : `(v${v}) Cold zobo is ready for the weekend. Order yours today. #zobo #lagosfood` });
  }
  if (system.includes("TASK: search")) {
    if (prompt.includes("MADEUP")) return JSON.stringify({ section: "services", trade: "Rocket repair", area: "Mars", when: "tomorrow", maxPriceNaira: -5, keywords: "rocket" });
    if (/\bac\b/i.test(prompt)) return JSON.stringify({ section: "services", trade: "AC repair", area: "lekki", when: "tomorrow", maxPriceNaira: 20000 });
    if (/zobo/i.test(prompt)) return JSON.stringify({ section: "products", category: "food", keywords: "zobo", maxPriceNaira: 3000 });
    return JSON.stringify({ section: "products" });
  }
  return "{}";
}

http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/count") return res.end(String(calls));
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      const body = JSON.parse(raw || "{}");
      const send = (status, obj) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      if (body.prompt === "agree") return (agreed = true), send(200, { success: true, result: { response: "Thank you for agreeing" } });
      calls++;
      const claude = req.url === "/v1/messages";
      const system = claude ? body.system : body.messages?.find((m) => m.role === "system")?.content ?? "";
      const user = claude ? body.messages[0].content : body.messages?.find((m) => m.role === "user")?.content;
      const prompt = Array.isArray(user) ? user.filter((p) => p.type === "text").map((p) => p.text).join(" ") : String(user ?? "");
      const hasImage = Array.isArray(user) && user.some((p) => p.type === "image" || p.type === "image_url");
      console.log(`${claude ? "claude" : "cloudflare"} ${req.url} image=${hasImage} :: ${prompt.slice(0, 80).replace(/\n/g, " ")}`);
      if (prompt.includes("SLOWAI")) await new Promise((r) => setTimeout(r, 25_000));
      if (prompt.includes("LICENCE") && !agreed && !claude)
        return send(403, { success: false, errors: [{ code: 5016, message: "Prior to using this model, you must submit the prompt 'agree'" }] });
      const text = answer(system, prompt);
      if (claude) return send(200, { id: "msg_fake", type: "message", role: "assistant", stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text }] });
      send(200, { success: true, result: { response: text } });
    });
  })
  .listen(port, () => console.log(`fake AI on ${port}`));
