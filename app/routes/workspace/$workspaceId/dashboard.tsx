import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import {
  Form,
  useLoaderData,
  useNavigation,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import classNames from "classnames";
import { useRef } from "react";
import { PrimaryButton } from "~/components/form";
import { SearchIcon } from "~/components/icons";
import { getTimeEntries } from "~/models/clockify.server";
import { getCurrentMonthString, getFirstAndLastDayOfMonth } from "~/utils/form";
import { formatDuration } from "~/utils/formatter";
import {
  checkBreakCompliance,
  doPeriodsOverlap,
  groupByDate,
} from "~/utils/time-analyzer";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const month = url.searchParams.get("month");

  if (!month) {
    return redirect(
      `/workspace/${
        params.workspaceId
      }/dashboard?month=${getCurrentMonthString()}`
    );
  }

  const { start, end } = getFirstAndLastDayOfMonth(
    month ?? getCurrentMonthString()
  );

  console.log("START", start.toISOString(), "END", end.toISOString());

  if (params.workspaceId) {
    const timeEntries = await getTimeEntries(params.workspaceId, {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    return json({ timeEntries: groupByDate(timeEntries) });
  } else {
    return redirect("/");
  }
}

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();

  const formRef = useRef<HTMLFormElement>(null);

  const isSearching = navigation.formData?.has("month");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Time Entries</h1>
      <Form ref={formRef} className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          name="month"
          type="month"
          defaultValue={searchParams.get("month") ?? undefined}
          className="px-3 py-2 border-2 border-gray-300 rounded-md"
        />
        <PrimaryButton type="submit" isLoading={isSearching}>
          <SearchIcon />
          {isSearching ? "Searching..." : "Search"}
        </PrimaryButton>
      </Form>
      <div>
        {Object.entries(data.timeEntries).map(([date, timeEntries], index) => (
          <div
            key={date}
            className={classNames("flex gap-1 flex-col", { "mt-4": index })}
          >
            <h2 className="font-extrabold">{date}</h2>
            <h2>
              {!checkBreakCompliance(timeEntries) && (
                <div className="flex flex-col bg-red-300 border-red-600 rounded-md p-4">
                  <h1 className="font-bold">Attention!</h1>
                  <p>This day does not comply with the break policy</p>
                </div>
              )}
            </h2>
            <h2>
              {doPeriodsOverlap(timeEntries) && (
                <div className="flex flex-col bg-yellow-200 border-red-600 rounded-md p-4">
                  <h1 className="font-bold">Warning!</h1>
                  <p>This day has overlapping time entries</p>
                </div>
              )}
            </h2>
            {timeEntries.map((timeEntry) => (
              <div
                key={timeEntry.id}
                className={classNames(
                  "flex justify-between items-center",
                  "px-3 py-2 rounded-md border-2 border-primary-light bg-white"
                )}
              >
                <div>{timeEntry.description}</div>
                <div className="whitespace-nowrap ml-4">
                  {formatDuration(timeEntry.timeInterval.duration)}
                </div>
              </div>
            ))}
          </div>
        ))}
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
      </div>
    );
  }

  return <div>An unexpected error occurred</div>;
}
