import "server-only";
import { db } from "@/db";
import { notifications } from "@/db/schema";

// Saves an in-app notice. Step 7 shows these and emails them.
export async function notify(userId: string, title: string, body: string, link?: string) {
  await db.insert(notifications).values({ userId, title, body, link }).catch(() => undefined);
}
