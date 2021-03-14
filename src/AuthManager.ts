import * as vscode from "vscode";
import * as http from "http";
import * as qs from "querystring";
import { deleteToken, setToken } from "./utils/credentials";
import { CLIENT_ID } from "./utils/twitch";
import loginHtml from "./static/login";
import successHtml from "./static/success";

const PORT = 6969;

export class AuthManager {
  private handleAuthChange?: () => void;

  onAuthChange(callback: () => void) {
    this.handleAuthChange = callback;
  }

  signIn() {
    this.createServer();

    vscode.env.openExternal(
      vscode.Uri.parse(
        `https://id.twitch.tv/oauth2/authorize?${qs.stringify({
          client_id: CLIENT_ID,
          redirect_uri: `http://localhost:${PORT}`,
          response_type: "token",
          scope: [
            "channel:read:redemptions",
            "channel:manage:redemptions",
          ].join(" "),
        })}`
      )
    );
  }

  async signOut() {
    await deleteToken();
    vscode.window.showInformationMessage(
      "Twitch Controller: Signed out of Twitch"
    );
    this.handleAuthChange?.();
  }

  private createServer() {
    const server = http
      .createServer(async (req, res) => {
        const parsedUrl = new URL(req.url!, `http://${req.headers.host}`);
        res.setHeader("content-type", "text/html");

        switch (parsedUrl.pathname) {
          case "/":
            res.write(loginHtml);
            break;
          case "/oauth":
            await setToken(parsedUrl.searchParams.get("access_token")!);

            vscode.window.showInformationMessage(
              "Twitch Controller: Sign in to twitch complete!"
            );

            res.write(successHtml);

            clearTimeout(shutdownServerTimeout);
            setTimeout(() => {
              server.close();
            }, 2000);

            this.handleAuthChange?.();

            break;

          default:
            res.write("Unknown path.");
            break;
        }

        res.end();
      })
      .listen(PORT);

    // After 2 minutes, automatically shut down the server
    const shutdownServerTimeout = setTimeout(() => {
      server.close();
      vscode.window.showWarningMessage(
        "Twitch Controller: Sign in to Twitch timed out. Please try again."
      );
    }, 2 * 60 * 1000);
  }
}
