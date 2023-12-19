import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import {
  NavLink,
  Outlet,
  useLoaderData,
  useNavigation,
  useResolvedPath,
  useRouteError,
} from "@remix-run/react";
import classNames from "classnames";
import { ClockIcon } from "~/components/icons";
import { getWorkspace } from "~/models/clockify.server";

export async function loader({ params }: LoaderFunctionArgs) {
  if (!params.workspaceId) {
    return redirect("/");
  }

  const workspace = await getWorkspace(params.workspaceId);

  return json({ workspace });
}

export default function SelectUser() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="md:flex md:h-[calc(100vh-55px)]">
      <nav className="bg-primary text-white">
        <ul className="flex md:flex-col">
          <AppNavLink to={`/workspace/${data.workspace.id}/dashboard`}>
            <ClockIcon />
          </AppNavLink>
        </ul>
      </nav>
      <div className="bg-background p-4 w-full md:w-[calc(100%-4rem)] overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (error instanceof Error) {
    return (
      <div className="flex flex-col bg-red-300 border-red-600 rounded-md p-4 m-4">
        <h1 className="text-3xl font-bold mb-4">Whoops!</h1>
        <p className="text-xl">{error.message}</p>
        <p className="text-xl mt-4">
          Select another workspace or try again later.
        </p>
      </div>
    );
  }

  return <div>An unexpected error occurred</div>;
}

type AppNavLinkProps = {
  to: string;
  children: React.ReactNode;
};
function AppNavLink({ to, children }: AppNavLinkProps) {
  const path = useResolvedPath(to);
  const navigation = useNavigation();

  const isLoading =
    navigation.state === "loading" &&
    navigation.location.pathname === path.pathname;

  return (
    <li className="w-16">
      <NavLink to={to}>
        {({ isActive }) => (
          <div
            className={classNames(
              "py-4 flex justify-center hover:bg-primary-light",
              { "bg-primary-light": isActive },
              { "animate-pulse bg-primary-light": isLoading }
            )}
          >
            {children}
          </div>
        )}
      </NavLink>
    </li>
  );
}
