import type { Metadata } from "next";
import { BackBar, Footer } from "@/components/ui";

export const metadata: Metadata = { title: "Contact · Vouchly" };

export default function Contact() {
  return (
    <main className="mx-auto min-h-dvh max-w-md">
      <BackBar title="Contact us" href="/" />
      <div className="flex flex-col gap-4 px-4 pt-2">
        <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <p className="text-[13px] font-bold text-muted">Business</p>
          <p className="mt-1 text-[17px] font-extrabold">Vouchly</p>
          <p className="mt-1 text-[14px] text-muted">A community marketplace for trusted local sellers in Lagos.</p>
        </section>
        <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <p className="text-[13px] font-bold text-muted">Address</p>
          <address className="mt-1 text-[15px] font-semibold not-italic leading-relaxed">
            57 Seriki Aro Avenue
            <br />
            Ikeja, Lagos
            <br />
            Nigeria 100282
          </address>
        </section>
        <section className="rounded-[20px] bg-white p-5 shadow-[0_1px_3px_rgba(20,33,61,0.08)]">
          <p className="text-[13px] font-bold text-muted">What we send by SMS</p>
          <p className="mt-1 text-[14px] leading-relaxed">
            Only one-time sign-in codes, for example: “Your Vouchly code is 482913. It expires in 10 minutes. Do not
            share this code with anyone.”
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
