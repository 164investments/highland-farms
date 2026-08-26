import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Container } from "@/components/ui/Container";
import { PRODUCTS } from "../data";
import { ADMIN_COOKIE, adminTokenConfigured, isValidToken } from "@/lib/shop/admin-auth";
import { AdminBody, type InventoryRow, type OrderRow } from "./AdminBody";

export const metadata: Metadata = {
  title: "Farm Store Admin | Highland Farms",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/** variant id -> the human name the farm knows it by. */
function variantNames(): Map<string, { name: string; label?: string; slug: string }> {
  const map = new Map<string, { name: string; label?: string; slug: string }>();
  for (const p of PRODUCTS) {
    for (const v of p.variants) {
      map.set(v.id, { name: p.name, label: v.label, slug: p.slug });
    }
  }
  return map;
}

async function loadData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { inventory: [], orders: [], error: "Supabase is not configured." };

  const db = createClient(url, key, { auth: { persistSession: false } });
  const names = variantNames();

  const [inv, ord] = await Promise.all([
    db
      .from("shop_inventory")
      .select(
        "variant_id, stock, low_stock_threshold, square_variation_id, square_item_name, synced_from_square_at",
      ),
    db
      .from("shop_orders")
      .select(
        "id, order_number, status, fulfillment, customer_name, customer_phone, total_cents, refunded_cents, created_at, channel",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (inv.error) console.error("[shop-admin] inventory read:", inv.error.message);
  if (ord.error) console.error("[shop-admin] orders read:", ord.error.message);

  const inventory: InventoryRow[] = (inv.data ?? [])
    .map((r) => {
      const meta = names.get(r.variant_id as string);
      return {
        variantId: r.variant_id as string,
        name: meta?.name ?? "(not in catalog)",
        label: meta?.label,
        slug: meta?.slug ?? "",
        stock: r.stock as number | null,
        lowStockThreshold: (r.low_stock_threshold as number) ?? 3,
        squareVariationId: (r.square_variation_id as string | null) ?? null,
        squareItemName: (r.square_item_name as string | null) ?? null,
        syncedAt: (r.synced_from_square_at as string | null) ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || (a.label ?? "").localeCompare(b.label ?? ""));

  const orders: OrderRow[] = (ord.data ?? []).map((r) => ({
    id: r.id as string,
    orderNumber: r.order_number as string,
    status: r.status as string,
    fulfillment: r.fulfillment as string,
    channel: (r.channel as string) ?? "online",
    customerName: r.customer_name as string,
    customerPhone: r.customer_phone as string,
    totalCents: r.total_cents as number,
    refundedCents: (r.refunded_cents as number) ?? 0,
    createdAt: r.created_at as string,
  }));

  return { inventory, orders, error: null as string | null };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const store = await cookies();
  const authorised =
    isValidToken(token) || isValidToken(store.get(ADMIN_COOKIE)?.value);

  if (!adminTokenConfigured()) {
    return (
      <Gate>
        <p>
          <code>SHOP_ADMIN_TOKEN</code> isn&apos;t set, so the admin is disabled.
          Add it in Vercel and reload.
        </p>
      </Gate>
    );
  }

  if (!authorised) {
    return (
      <Gate>
        <p>Add your access token to the address bar to continue:</p>
        <p className="mt-2 font-mono text-xs text-muted">
          /shop/admin?token=YOUR_TOKEN
        </p>
      </Gate>
    );
  }

  const { inventory, orders, error } = await loadData();

  return (
    <main className="bg-cream pt-28 pb-20">
      <Container className="max-w-6xl">
        <h1 className="font-display text-3xl font-light tracking-tight text-charcoal">
          Farm store
        </h1>
        <p className="mt-1.5 text-sm text-muted font-sans">
          Stock, orders, and what&apos;s linked to Square.
        </p>
        {error ? (
          <p className="mt-8 rounded-xl bg-white p-4 text-sm text-charcoal font-sans">
            {error}
          </p>
        ) : (
          <AdminBody
            inventory={inventory}
            orders={orders}
            // Passed so the browser can authorise its own writes; it is the
            // same token already in this viewer's cookie.
            token={token ?? store.get(ADMIN_COOKIE)?.value ?? ""}
            setCookie={Boolean(token)}
          />
        )}
      </Container>
    </main>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-cream pt-32 pb-20">
      <Container className="max-w-lg">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="font-display text-2xl font-light text-charcoal">
            Farm store admin
          </h1>
          <div className="mt-3 text-sm text-muted font-sans">{children}</div>
        </div>
      </Container>
    </main>
  );
}
