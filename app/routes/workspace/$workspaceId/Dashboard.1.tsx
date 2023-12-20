import {
  Form,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "@remix-run/react";
import classNames from "classnames";
import { useRef } from "react";
import { DeleteButton, PrimaryButton } from "~/components/form";
import { SearchIcon } from "~/components/icons";
import { formatDuration } from "~/utils/formatter";
import {
  checkBreakCompliance,
  doTimeEntriesOverlap,
} from "~/utils/time-analyzer";
import { loader } from "./dashboard";

export default function Dashboard() {
  const data = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();

  const formRef = useRef<HTMLFormElement>(null);

  const isSearching =
    navigation.formData?.has("start") || navigation.formData?.has("end");

  const resetForm = () => {
    formRef.current.reset();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Time Entries</h1>
      <Form ref={formRef} className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          name="start"
          type="date"
          defaultValue={searchParams.get("start") ?? undefined}
          className="px-3 py-2 border-2 border-gray-300 rounded-md"
        />
        <input
          name="end"
          type="date"
          defaultValue={searchParams.get("end") ?? undefined}
          className="px-3 py-2 border-2 border-gray-300 rounded-md"
        />
        <DeleteButton onClick={resetForm}>Reset Filters</DeleteButton>
        <PrimaryButton type="submit" isLoading={isSearching}>
          {isSearching ? "Searching..." : <SearchIcon />}
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
              {doTimeEntriesOverlap(timeEntries) && (
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
