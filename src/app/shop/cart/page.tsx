import type { Metadata } from "next";
import { CartBody } from "./CartBody";

export const metadata: Metadata = {
  title: "Your Cart | Highland Farms",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartBody />;
}
