"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shops } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createSubaccount, listBanks, resolveAccount } from "@/lib/paystack";
import { myShop } from "@/lib/shops";

export type PayoutState = { error?: string; accountName?: string; saved?: boolean; values?: Record<string, string> } | undefined;

// Two steps: first check the account name, then save it with Paystack.
export async function savePayout(_: PayoutState, form: FormData): Promise<PayoutState> {
  const user = await requireUser();
  const shop = await myShop(user.id);
  if (!shop || !user.confirmed) return { error: "Only confirmed sellers can add a payout account." };

  const bankCode = String(form.get("bank") ?? "");
  const accountNumber = String(form.get("account") ?? "").replace(/\D/g, "");
  const confirm = form.get("confirm") === "1";
  const values = { bank: bankCode, account: accountNumber };
  if (!bankCode) return { error: "Please pick your bank.", values };
  if (accountNumber.length !== 10) return { error: "Account numbers have 10 digits.", values };

  let accountName: string;
  try {
    accountName = (await resolveAccount(accountNumber, bankCode)).account_name;
  } catch {
    return { error: "We couldn't find that account. Please check the number and bank.", values };
  }
  if (!confirm) return { accountName, values };

  try {
    const banks = await listBanks();
    const sub = await createSubaccount({ businessName: shop.name, bankCode, accountNumber, phone: user.phone });
    await db
      .update(shops)
      .set({
        paystackSubaccount: sub.subaccount_code,
        payoutBank: banks.find((b) => b.code === bankCode)?.name ?? bankCode,
        payoutAccountName: accountName,
        payoutAccountLast4: accountNumber.slice(-4),
      })
      .where(eq(shops.id, shop.id));
  } catch (e) {
    return { error: `Paystack couldn't save it: ${(e as Error).message}`, values, accountName };
  }
  revalidatePath("/shop/manage");
  return { saved: true };
}
