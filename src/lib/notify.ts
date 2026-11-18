import "server-only";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { emailAlert } from "./email-alerts";

// Saves an in-app notice. A failure is logged, never shown to the person who caused it.
// email: also send it by email (new orders and problems). The email goes out in the background.
export async function notify(userId: string, title: string, body: string, link?: string, opts?: { email?: boolean }) {
  await db
    .insert(notifications)
    .values({ userId, title, body, link })
    .catch((e) => console.error("Notice not saved:", (e as Error).message));
  if (opts?.email) void emailAlert(userId, title, body, link);
}

type Notice = { userId: string; title: string; body: string; link?: string };

// Saves many notices in a few big inserts. Gives back how many were saved.
export async function notifyMany(list: Notice[]) {
  let saved = 0;
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500);
    try {
      await db.insert(notifications).values(chunk);
      saved += chunk.length;
    } catch (e) {
      console.error("Notices not saved:", (e as Error).message);
    }
  }
  return saved;
}
