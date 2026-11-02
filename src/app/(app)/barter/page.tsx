import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/primitives";
import { BarterView } from "./barter-view";

export const metadata: Metadata = { title: "Barter estimator" };

export default function BarterPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading estimator" />}>
      <BarterView />
    </Suspense>
  );
}
