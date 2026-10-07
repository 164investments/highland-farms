import { isSoldOut, type StockRecord } from "@/components/shop/track";
import { PRODUCTS, type Category, type Product } from "./data";

/**
 * In stock first, catalogue order within each group. Plain module (no "use
 * client") so the server page can count shelves and the client body can list them.
 */
export function shelfProducts(cat: Category, stock: StockRecord): { open: Product[]; out: Product[] } {
  const all = PRODUCTS.filter((p) => p.category === cat.key);
  return {
    open: all.filter((p) => !isSoldOut(stock, p)),
    out: all.filter((p) => isSoldOut(stock, p)),
  };
}
