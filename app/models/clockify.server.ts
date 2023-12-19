import dotenv from "dotenv";
dotenv.config();

const BASE_URL_V1 = "https://api.clockify.me/api/v1";
const API_KEY = process.env.API_KEY;

export type TimeEntry = {
  id: string;
  description: string;
  userId: string;
  projectId: string;
  workspaceId: string;
  timeInterval: {
    start: string;
    end: string;
    duration: string;
  };
  customFieldValues: {
    customFieldId: string;
    timeEntryId: string;
    value: boolean;
    name: string;
    type: "CHECKBOX";
  }[];
  isLocked: boolean;
};

function sendRequest({
  method = "GET",
  path,
  body = {},
  params = {},
}: {
  method?: string;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
}) {
  if (!API_KEY) {
    throw new Error("API_KEY in .env file not set");
  }
  if (method === "GET") {
    return fetch(`${BASE_URL_V1}${path}?${new URLSearchParams(params)}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
      },
    });
  } else {
    return fetch(`${BASE_URL_V1}${path}?${new URLSearchParams(params)}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });
  }
}

let userId: string | null = null;
const getUserId = async () => {
  if (!userId) {
    userId = (await getCurrentUser()).id;
  }
  return userId;
};

export async function getWorkspace(
  workspaceId: string
): Promise<{ id: string; name: string }> {
  const response = await sendRequest({ path: `/workspaces/${workspaceId}` });
  return response.json();
}

export async function getAllWorkspaces(): Promise<
  { id: string; name: string }[]
> {
  const response = await sendRequest({ path: `/workspaces` });
  return response.json();
}

type User = {
  id: string;
  name: string;
  email: string;
};
export async function getCurrentUser(): Promise<User> {
  const response = await sendRequest({ path: "/user" });
  return response.json();
}

export async function getTimeEntries(
  workspaceId: string,
  params?: { start?: string | null; end?: string | null }
): Promise<TimeEntry[]> {
  const userId = await getUserId();

  if (params?.start) {
    params.start = new Date(params.start).toISOString();
  }
  if (params?.end) {
    const dateEnd = new Date(params.end);
    dateEnd.setHours(23, 59, 59, 999);
    params.end = dateEnd.toISOString();
  }

  const response = await sendRequest({
    path: `/workspaces/${workspaceId}/user/${userId}/time-entries`,
    params: {
      start: params?.start ?? "",
      end: params?.end ?? "",
      "page-size": "200",
    },
  });
  const res = await response.json();

  if (
    !Array.isArray(res) &&
    Object.hasOwn(res, "message") &&
    Object.hasOwn(res, "code")
  ) {
    if (res.code === 501) {
      throw new Error(res.message);
    }
    throw new Error(JSON.stringify(res));
  }

  return res;
}
