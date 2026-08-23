import type { Route } from "./+types/kategori";
import { referenceAction, referenceLoader } from "./reference-route.server";
import { ReferencePage } from "@/components/admin/reference-page";

export const meta: Route.MetaFunction = () => [{ title: "Kategori Produk | Panel Admin" }];

export const loader = referenceLoader("product_category");
export const action = referenceAction("product_category");

export default function Page({ loaderData }: Route.ComponentProps) {
  return <ReferencePage kind="product_category" loaderData={loaderData} />;
}
