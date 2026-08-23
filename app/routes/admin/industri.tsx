import type { Route } from "./+types/industri";
import { referenceAction, referenceLoader } from "./reference-route.server";
import { ReferencePage } from "@/components/admin/reference-page";

export const meta: Route.MetaFunction = () => [{ title: "Industri | Panel Admin" }];

export const loader = referenceLoader("industry");
export const action = referenceAction("industry");

export default function Page({ loaderData }: Route.ComponentProps) {
  return <ReferencePage kind="industry" loaderData={loaderData} />;
}
