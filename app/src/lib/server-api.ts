export const getServerApiBaseUrl = () => {
  const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("Server API URL is not configured");
  }

  return apiUrl.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
};

export const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error("Server API returned a non-JSON response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Server API returned invalid JSON.");
  }
};
