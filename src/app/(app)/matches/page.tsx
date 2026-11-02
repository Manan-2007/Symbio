import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/primitives";
import { MatchesView } from "./matches-view";

export const metadata: Metadata = { title: "Smart matches" };

export default function MatchesPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading matches" />}>
      <MatchesView />
    </Suspense>
  );
}
