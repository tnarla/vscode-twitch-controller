import { ApiClient } from "twitch";
import { StaticAuthProvider } from "twitch-auth";
import { getToken } from "./credentials";

export const CLIENT_ID = "p4343bdppj75y5ila2z417paly45q7";

let apiClient: ApiClient;

export async function getAPIClient() {
  if (apiClient) {
    return apiClient;
  }

  const token = await getToken();
  if (!token) {
    return null;
  }

  const authProvider = new StaticAuthProvider(CLIENT_ID, token!);
  apiClient = new ApiClient({ authProvider });
  return apiClient;
}
