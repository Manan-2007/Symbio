import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/primitives";
import { CompanyProfile } from "./company-profile";

export default function CompanyPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading company" />}>
      <CompanyProfile />
    </Suspense>
  );
}
