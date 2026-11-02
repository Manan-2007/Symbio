import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/primitives";
import { MatchDetail } from "./match-detail";

export default function MatchDetailPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading match" />}>
      <MatchDetail />
    </Suspense>
  );
}
