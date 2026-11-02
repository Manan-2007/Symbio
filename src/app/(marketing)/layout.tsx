import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SymbioAssistant } from "@/components/assistant";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <SymbioAssistant />
    </>
  );
}
