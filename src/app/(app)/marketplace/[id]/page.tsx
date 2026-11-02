import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/primitives";
import { ListingDetail } from "./listing-detail";

// Listing IDs live in browser storage, so the param is read on the client inside Suspense.
export default function ListingPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading listing" />}>
      <ListingDetail />
    </Suspense>
  );
}
