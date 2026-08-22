import { ReferencePage } from "../reference-page";

export const metadata = { title: "Kategori Produk" };

export default async function Page() {
  return <ReferencePage kind="product_category" />;
}
