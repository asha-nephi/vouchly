// Fake Twilio for tests: node scripts/fake-twilio.mjs 4012
// Sends nothing. Logs each message. A Body or To containing "FAIL" (or To +2349000000000) returns a Twilio-style error.
import http from "node:http";

const port = Number(process.argv[2] ?? 4012);

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const m = req.url.match(/^\/2010-04-01\/Accounts\/([^/]+)\/Messages\.json$/);
      const send = (status, obj) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      if (req.method !== "POST" || !m) return send(404, { code: 20404, message: "Not found", status: 404 });
      const auth = Buffer.from((req.headers.authorization ?? "").replace(/^Basic /, ""), "base64").toString();
      if (!auth.startsWith(m[1] + ":") || auth.length <= m[1].length + 1) {
        return send(401, { code: 20003, message: "Authenticate", status: 401 });
      }
      const p = new URLSearchParams(raw);
      const to = p.get("To") ?? "";
      const body = p.get("Body") ?? "";
      const sender = p.get("MessagingServiceSid") ? `service ${p.get("MessagingServiceSid")}` : `from ${p.get("From")}`;
      console.log(`[fake-twilio] to ${to} ${sender}: ${body}`);
      if (!/^\+\d{8,15}$/.test(to)) return send(400, { code: 21211, message: `Invalid 'To' Phone Number: ${to}`, status: 400 });
      if (body.includes("FAIL") || to === "+2349000000000") {
        return send(400, { code: 21408, message: "Permission to send an SMS has not been enabled for the region", status: 400 });
      }
      send(201, { sid: "SM" + Math.random().toString(16).slice(2).padEnd(32, "0"), status: "queued", to, body, error_code: null });
    });
  })
  .listen(port, () => console.log(`fake twilio on http://localhost:${port}`));
