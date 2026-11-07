import "server-only";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";

// The only file that knows where photos live.
// With R2 keys set → Cloudflare R2. Without them → the database (fine for testing).

const MAX_BYTES = 1_500_000;
const ALLOWED = ["image/webp", "image/jpeg", "image/png"];
const EXT: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

const r2 =
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_PUBLIC_URL
    ? new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
      })
    : null;

export const photoUrl = (id: string) => `/api/photos/${id}`;

// Accepts photos stored either way, so old database photos keep working after the switch.
export const isOurPhoto = (url: string) =>
  url.startsWith("/api/photos/") || (!!process.env.R2_PUBLIC_URL && url.startsWith(process.env.R2_PUBLIC_URL));

export async function savePhoto(ownerId: string, file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error("Please use a JPG, PNG or WebP photo.");
  if (file.size > MAX_BYTES) throw new Error("That photo is too big. Please pick a smaller one.");
  const data = Buffer.from(await file.arrayBuffer());

  if (r2) {
    const key = `p/${ownerId}/${randomUUID()}.${EXT[file.type]}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET ?? "vouchly-photos",
        Key: key,
        Body: data,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }

  const [row] = await db
    .insert(photos)
    .values({ ownerId, mime: file.type, bytes: data.length, data })
    .returning({ id: photos.id });
  return photoUrl(row.id);
}

export async function readPhoto(id: string) {
  const [row] = await db.select({ mime: photos.mime, data: photos.data }).from(photos).where(eq(photos.id, id)).limit(1);
  return row ?? null;
}

// Pulls every uploaded file out of a form field.
export function filesFrom(form: FormData, name: string): File[] {
  return form.getAll(name).filter((f): f is File => f instanceof File && f.size > 0);
}
