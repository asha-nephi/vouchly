import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BuyerRegistrationForm from "./registration-form";
import { currentUser } from "@/lib/auth";
import { emailReady } from "@/lib/email";
import { googleReady } from "@/lib/google";

export const metadata: Metadata = {
  title: "Create a buyer account",
  description: "Create a Vouchly buyer account with email or Google.",
};
export const dynamic = "force-dynamic";

export default async function Register() {
  const me = await currentUser();
  if (me && !me.isGuest) redirect("/home");
  return <BuyerRegistrationForm emailEnabled={emailReady()} googleEnabled={googleReady()} />;
}
