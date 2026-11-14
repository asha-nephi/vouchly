// The one main action, in a bar at the bottom on phones. On computers it sits in place.
export default function ActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white px-4 pb-[calc(1.125rem+env(safe-area-inset-bottom))] pt-3 lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0">
      <div className="mx-auto flex max-w-md items-center gap-2.5 lg:max-w-none">{children}</div>
    </div>
  );
}
