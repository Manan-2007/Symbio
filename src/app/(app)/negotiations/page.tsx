import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/primitives";
import { NegotiationsView } from "./negotiations-view";

export const metadata: Metadata = { title: "Negotiations" };

export default function NegotiationsPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading negotiations" />}>
      <NegotiationsView />
    </Suspense>
  );
}
