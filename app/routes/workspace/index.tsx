import { redirect } from "@remix-run/node";

export function loader({ params }) {
  console.log("INDEX", params);
  return redirect("/");
}
