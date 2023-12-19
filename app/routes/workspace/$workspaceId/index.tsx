import { LoaderFunctionArgs, redirect } from "@remix-run/node";

export function loader({ params }: LoaderFunctionArgs) {
  if (params.workspaceId) {
    return redirect(`/workspace/${params.workspaceId}/dashboard`);
  }
  return redirect("/");
}
