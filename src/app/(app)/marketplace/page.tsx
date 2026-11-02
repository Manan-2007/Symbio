import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/primitives";
import { MarketplaceView } from "./marketplace-view";

export const metadata: Metadata = { title: "Marketplace" };

export default function MarketplacePage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading marketplace" />}>
      <MarketplaceView />
    </Suspense>
  );
}
