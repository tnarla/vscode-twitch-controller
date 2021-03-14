import * as keytar from "keytar";

const KEYTAR_SERVICE = "vscode-font-changer";
const TOKEN_KEY = "twitch-access-token";

export async function setToken(token: string) {
  await keytar.setPassword(KEYTAR_SERVICE, TOKEN_KEY, token);
}

export async function deleteToken() {
  await keytar.deletePassword(KEYTAR_SERVICE, TOKEN_KEY);
}

export async function getToken() {
  return await keytar.getPassword(KEYTAR_SERVICE, TOKEN_KEY);
}
