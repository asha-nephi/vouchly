// Result of a bulk action: how many worked, and which failed and why.
export type BulkResult = { done: number; total: number; failed: { id: string; label: string; error: string }[] };

// Run one action per record, in order, inside one request. Pages use this inside their own server action.
export async function runEach(ids: string[], label: (id: string) => string, fn: (id: string) => Promise<string | null | void>): Promise<BulkResult> {
  const list = [...new Set(ids)].slice(0, 100);
  const failed: BulkResult["failed"] = [];
  for (const id of list) {
    try {
      const err = await fn(id);
      if (err) failed.push({ id, label: label(id), error: err });
    } catch (e) {
      console.error("bulk action failed", id, e);
      failed.push({ id, label: label(id), error: "Something went wrong." });
    }
  }
  return { done: list.length - failed.length, total: list.length, failed };
}
