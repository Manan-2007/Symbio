import { DemoProvider } from "@/components/demo-provider";
import { SymbioApp } from "@/components/symbio-app";

// Server component: renders the client boundary only. All browser state
// (localStorage, selected profile) lives inside DemoProvider.
export default function Home() {
  return (
    <main>
      <DemoProvider>
        <SymbioApp />
      </DemoProvider>
    </main>
  );
}
