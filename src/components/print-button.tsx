"use client";

// Opens the phone's or computer's print screen (also "Save as PDF").
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="flex h-11 flex-1 items-center justify-center rounded-xl border border-line bg-white px-3 text-sm font-bold">
      Print or save
    </button>
  );
}
