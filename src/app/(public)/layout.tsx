import TopBar from "@/components/top-bar";

// Computers get a top bar; phones keep the bottom tabs.
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      {children}
    </>
  );
}
