import { AppShell } from "@/components/layout/app-shell";
import { SymbioAssistant } from "@/components/assistant";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <SymbioAssistant />
    </>
  );
}
