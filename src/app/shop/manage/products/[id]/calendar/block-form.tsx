"use client";

import { useMemo, useState } from "react";
import { saveBlockedDates } from "@/app/shop/actions";
import Calendar from "@/components/calendar";
import SubmitButton from "@/components/submit-button";

export default function BlockForm({ id, today, blocked, booked }: { id: string; today: string; blocked: string[]; booked: string[] }) {
  const [days, setDays] = useState(() => new Set(blocked));
  const bookedSet = useMemo(() => new Set(booked), [booked]);
  const toggle = (k: string) =>
    setDays((d) => {
      const n = new Set(d);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  return (
    <form action={saveBlockedDates} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="dates" value={[...days].join(",")} />
      <Calendar mode="toggle" today={today} taken={days} booked={bookedSet} onToggle={toggle} />
      <div className="flex gap-4 px-1 text-xs font-semibold text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-soft" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-[#fbebeb]" /> Blocked
        </span>
      </div>
      <SubmitButton className="h-[54px] w-full rounded-2xl bg-ink text-[15px] font-bold text-white">
        Save calendar · {days.size} {days.size === 1 ? "night" : "nights"} blocked
      </SubmitButton>
    </form>
  );
}
