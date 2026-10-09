import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentReturn } from "./PaymentReturn";

export const metadata: Metadata = {
  title: "Payment confirmation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PaymentReturnPage() {
  return (
    <div className="surface-paper min-h-svh bg-paper px-5 pb-16 pt-[calc(var(--header-h,104px)+2rem)] font-sans text-ink lg:px-16 lg:pt-[calc(var(--header-h,104px)+4rem)]">
      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<><h1 className="field-heading m-0 font-display text-[38px] leading-tight lg:text-[52px]">Checking your payment.</h1><p role="status" className="mt-4 text-ink-body">Please wait while we check with the farm.</p></>}>
          <PaymentReturn />
        </Suspense>
      </div>
    </div>
  );
}
