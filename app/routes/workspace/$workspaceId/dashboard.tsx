import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import {
  Form,
  useLoaderData,
  useNavigation,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import classNames from "classnames";
import dayjs from "dayjs";
import { useRef } from "react";
import { PrimaryButton } from "~/components/form";
import { SearchIcon } from "~/components/icons";
import { getTimeEntries } from "~/models/clockify.server";
import { getCurrentMonthString, getFirstAndLastDayOfMonth } from "~/utils/form";
import { formatDurationInMinutes } from "~/utils/formatter";
import {
  calculateTotalWorkTime,
  checkBreakCompliance,
  doTimeEntriesOverlap,
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
        {Object.entries(data.timeEntries).map(([date, timeEntries]) => {
          const { valid, periodsWithBreaks, reason } =
            checkBreakCompliance(timeEntries);
          return (
            <div key={date} className={classNames("flex gap-1 flex-col mt-6")}>
              <h2 className="font-extrabold text-xl">
                {date} (
                {formatDurationInMinutes(calculateTotalWorkTime(timeEntries))})
              </h2>
              {!valid && (
                <div className="flex flex-col bg-red-300 border-red-600 rounded-md p-4 mt-2">
                  <h3 className="font-bold text-lg">Attention!</h3>
                  <p>This day does not comply with the break policy</p>
                  {!!reason && (
                    <ul className="list-disc list-inside">
                      <li>{reason}</li>
                    </ul>
                  )}
                </div>
              )}
              {doTimeEntriesOverlap(timeEntries) && (
                <div className="flex flex-col bg-yellow-200 border-red-600 rounded-md p-4 mt-2">
                  <h1 className="font-bold">Warning!</h1>
                  <p>This day has overlapping time entries</p>
                </div>
              )}
              <div className="mt-2">
                {periodsWithBreaks?.map((period, index) => (
                  <div key={index}>
                    <div className="flex items-center text-xs py-1 text-gray-400">
                      {dayjs(period.end).format("HH:mm")}
                      <div className="ml-1 flex-grow border-t border-gray-300"></div>
                    </div>
                    <div
                      key={index}
                      className={classNames(
                        period.isBreak
                          ? period.durationInMinutes < 15
                            ? "bg-red-300 line-through py-0"
                            : "bg-white"
                          : "bg-white",
                        { "border-dotted": period.isBreak },
                        "flex justify-between items-center",
                        "px-3 py-2 rounded-md border-2 border-primary-light ",
                        { "bg-yellow-200": period.doesOverlap }
                      )}
                    >
                      <div className="flex">
                        <div className="w-1/2">
                          {period.isBreak ? "Break" : "Work"}
                        </div>
                      </div>

                      <div className="whitespace-nowrap ml-4">
                        {formatDurationInMinutes(period.durationInMinutes)}
                      </div>
                    </div>
                    {index === periodsWithBreaks.length - 1 && (
                      <div className="flex items-center text-xs py-1 text-gray-400">
                        {dayjs(period.start).format("HH:mm")}
                        <div className="ml-1 flex-grow border-t border-gray-300"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
