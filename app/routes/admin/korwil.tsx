import type { Route } from "./+types/korwil";
import { referenceAction, referenceLoader } from "./reference-route.server";
import { ReferencePage } from "@/components/admin/reference-page";

export const meta: Route.MetaFunction = () => [{ title: "Korwil | Panel Admin" }];

export const loader = referenceLoader("korwil");
export const action = referenceAction("korwil");

export default function Page({ loaderData }: Route.ComponentProps) {
  return <ReferencePage kind="korwil" loaderData={loaderData} />;
}
