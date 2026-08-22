"use client";

import { ProductForm } from "@/app/(member)/dashboard/produk/product-form";
import { adminUpdateProduct, adminDeleteProduct } from "../../actions";
import type { Product, Business } from "@/types/database";

/** The member product form, bound to the admin actions. */
export function AdminProductForm({
  product,
  businesses,
  userId,
}: {
  product: Product;
  businesses: Pick<Business, "id" | "name">[];
  userId: string;
}) {
  return (
    <ProductForm
      product={product}
      businesses={businesses}
      userId={userId}
      updateAction={adminUpdateProduct}
      deleteAction={adminDeleteProduct}
      backHref="/admin/produk"
    />
  );
}
