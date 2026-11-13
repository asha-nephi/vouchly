import "server-only";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { FILE_TYPES, fileExt } from "./file-types";

// Paid files live in a private R2 bucket when keys are set, otherwise in the database.
const r2 =
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
      })
    : null;
const BUCKET = process.env.R2_FILES_BUCKET ?? "vouchly-files";

// Smaller limit while files sit in the database, to keep it light.
export const MAX_FILE_MB = r2 ? 25 : 10;

export async function saveFile(ownerId: string, file: File) {
  const ext = fileExt(file.name);
  const mime = FILE_TYPES[ext];
  if (!mime) throw new Error("That file type isn't supported. Try PDF, EPUB, ZIP, MP3, DOCX, XLSX or PPTX.");
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Files can be up to ${MAX_FILE_MB} MB. Try compressing it or zipping it.`);
  if (file.size === 0) throw new Error("That file is empty.");
  const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(-120);
  const data = Buffer.from(await file.arrayBuffer());
  if (r2) {
    const key = `f/${ownerId}/${crypto.randomUUID()}.${ext}`;
    await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: data, ContentType: mime }));
    const [row] = await db.insert(files).values({ ownerId, name, mime, bytes: file.size, r2Key: key }).returning({ id: files.id });
    return { id: row.id, name, bytes: file.size };
  }
  const [row] = await db.insert(files).values({ ownerId, name, mime, bytes: file.size, data }).returning({ id: files.id });
  return { id: row.id, name, bytes: file.size };
}

// The file's bytes. Callers must check the person is allowed first.
export async function readFile(id: string) {
  const [f] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!f) return null;
  if (f.r2Key) {
    if (!r2) return null;
    const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: f.r2Key }));
    const body = res.Body ? Buffer.from(await res.Body.transformToByteArray()) : null;
    return body ? { name: f.name, mime: f.mime, body } : null;
  }
  return f.data ? { name: f.name, mime: f.mime, body: Buffer.from(f.data) } : null;
}
