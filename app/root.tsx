import {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import styles from "./tailwind.css";
import classNames from "classnames";
import { getAllWorkspaces } from "./models/clockify.server";
import { useRef } from "react";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export async function loader({ params }: LoaderFunctionArgs) {
  const workspaces = await getAllWorkspaces();
  const wordspaceId = params.workspaceId;

  if (!wordspaceId) {
    return redirect(`/workspace/${workspaces[0].id}`);
  }

  return json({ workspaces, currentWorkspaceId: wordspaceId });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const selectedItem = formData.get("selectWorkspace");
  return redirect(`/workspace/${selectedItem}`);
}

export default function App() {
  const data = useLoaderData<typeof loader>();
  const formRef = useRef<HTMLFormElement>(null);
  const selectWorkspaceFetcher = useFetcher();

  const isLoadingWorkspace =
    selectWorkspaceFetcher.formData?.get("selectWorkspace");

  const handleChange = () => {
    if (formRef.current) {
      formRef.current.requestSubmit();
    }
  };

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-screen">
        <nav
          className={classNames(
            "flex justify-end",
            "md:border-b-2  md:border-b-gray-200 border-0 py-2 px-4"
          )}
        >
          <selectWorkspaceFetcher.Form
            ref={formRef}
            method="post"
            className="drop-shadow-none"
          >
            <select
              name="selectWorkspace"
              defaultValue={data.currentWorkspaceId}
              onChange={handleChange}
              className={classNames(
                "px-3 py-2",
                "outline-2 outline-gray-300 rounded-md border-2 border-gray-300",
                {
                  "animate-pulse bg-gray-200": isLoadingWorkspace,
                }
              )}
            >
              {data.workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </selectWorkspaceFetcher.Form>
        </nav>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return (
      <div className="flex flex-col bg-red-300 border-red-600 rounded-md p-4 m-4">
        <h1 className="text-3xl font-bold mb-4">Whoops!</h1>
        <p className="text-xl">{error.message}</p>
      </div>
    );
  }

  return <div>An unexpected error occurred</div>;
}
