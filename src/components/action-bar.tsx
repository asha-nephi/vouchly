// The one main action, in a bar at the bottom. Pages using it add bottom padding.
export default function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 pb-[calc(1.125rem+env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto flex max-w-md items-center gap-2.5">{children}</div>
    </div>
  );
}
