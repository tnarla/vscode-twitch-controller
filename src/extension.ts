// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fontList from "font-list";
import * as http from "http";
import * as qs from "querystring";
import * as url from "url";
import { ApiClient } from "twitch";
import { StaticAuthProvider } from "twitch-auth";
import * as keytar from "keytar";
import { PubSubClient } from "twitch-pubsub-client";

const clientId = "p4343bdppj75y5ila2z417paly45q7";
let apiClient: ApiClient;
let status: vscode.StatusBarItem;

const OAUTH_REPLACE_HTML = `
<html>
<head>
    <script type="text/javascript">
        window.onload = function () {
            if (window.location.pathname === '/oauth') {
                window.close();
                return;
            }
            window.location.href = 'oauth?' + window.location.hash.replace('#', '');
        };
    </script>
</head>
</html>`;

async function setup() {
  const token = await keytar.getPassword(
    "vscode-font-changer",
    "twitch-access-token"
  );

  if (!token) {
    status.text = "Font Changer: Sign In";
    status.command = "font-changer.signInTwitch";
    return null;
  }

  const pubSubClient = new PubSubClient();
  const authProvider = new StaticAuthProvider(clientId, token!);

  apiClient = new ApiClient({ authProvider });
  const userId = await pubSubClient.registerUserListener(apiClient);

  try {
    const customReward = await apiClient.helix.channelPoints.createCustomReward(
      userId,
      {
        title: "Change Font",
        prompt: "What font do you want?",
        cost: 1,
        isEnabled: true,
        userInputRequired: true,
      }
    );
  } catch {}

  try {
    const enhance = await apiClient.helix.channelPoints.createCustomReward(
      userId,
      {
        title: "Enhance",
        prompt: "E N H A N C E",
        cost: 1,
        isEnabled: true,
      }
    );
  } catch {}

  try {
    const lineHeight = await apiClient.helix.channelPoints.createCustomReward(
      userId,
      {
        title: "Change Line Height",
        prompt: "Enter number between -10 & 10",
        cost: 100,
        isEnabled: true,
        userInputRequired: true,
      }
    );
  } catch {}

  const listener = await pubSubClient.onRedemption(userId, async (message) => {
    if (message.rewardName === "Change Font") {
      const fonts = await fontList.getFonts();

      const font = fonts.find((el) => {
        if (
          el.toLowerCase().replace(/["']/g, "") ===
          message.message.toLowerCase().replace(/["']/g, "")
        )
          return true;
      });

      const status = font ? "CANCELED" : "FULFILLED";
      if (font) {
        vscode.workspace.getConfiguration().update("editor.fontFamily", font);
        vscode.window.showInformationMessage(
          `${message.userDisplayName} changed font to ${font}`
        );
      } else {
        vscode.window.showInformationMessage(
          `Font Changer: "${message.message}" does not exist`
        );
      }

      await apiClient.helix.channelPoints.updateRedemptionStatusByIds(
        userId,
        message.rewardId,
        [message.id],
        status
      );
    } else if (message.rewardName === "Enhance") {
      const ENHANCE_AMOUNT = 0.5;
      vscode.workspace
        .getConfiguration()
        .update(
          "window.zoomLevel",
          (vscode.workspace
            .getConfiguration()
            .get<number>("window.zoomLevel") || 1) + ENHANCE_AMOUNT
        );

      setTimeout(() => {
        vscode.workspace
          .getConfiguration()
          .update(
            "window.zoomLevel",
            (vscode.workspace
              .getConfiguration()
              .get<number>("window.zoomLevel") || 1) - ENHANCE_AMOUNT
          );
      }, 10000);
    } else if (message.rewardName === "Change Line Height") {
      const height = parseInt(message.message);

      console.log(height);

      if (height <= 10 && height >= -10 && !isNaN(height)) {
        vscode.workspace
          .getConfiguration()
          .update(
            "editor.lineHeight",
            (vscode.workspace
              .getConfiguration()
              .get<number>("editor.lineHeight") || 1) + height
          );
      } else {
        await apiClient.helix.channelPoints.updateRedemptionStatusByIds(
          userId,
          message.rewardId,
          [message.id],
          "CANCELED"
        );
      }
    }
  });

  status.text = "Font Changer: Connected ✅";
}

export async function activate(context: vscode.ExtensionContext) {
  status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  status.text = `Font Changer: Connecting...`;
  status.show();

  http
    .createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url!, true);

      if (parsedUrl.pathname === "/") {
        res.setHeader("content-type", "text/html");
        res.write(OAUTH_REPLACE_HTML);
        res.end();
        return;
      } else if (parsedUrl.pathname === "/oauth") {
        await keytar.setPassword(
          "vscode-font-changer",
          "twitch-access-token",
          parsedUrl.query.access_token as string
        );

        setup();

        vscode.window.showInformationMessage(
          "Font Changer: Sign in to twitch complete!"
        );
        res.write("Sign in complete, you may close your browser.");
        res.end();
        return;
      }

      res.write("Unknown path.");
      res.end();
    })
    .listen(6969);

  let signIn = vscode.commands.registerCommand(
    "font-changer.signInTwitch",
    () => {
      vscode.env.openExternal(
        vscode.Uri.parse(
          `https://id.twitch.tv/oauth2/authorize?${qs.stringify({
            client_id: "p4343bdppj75y5ila2z417paly45q7",
            redirect_uri: "http://localhost:6969",
            response_type: "token",
            scope: [
              "channel:read:redemptions",
              "channel:manage:redemptions",
            ].join(" "),
          })}`
        )
      );
    }
  );

  context.subscriptions.push(signIn);

  setup();
}

// this method is called when your extension is deactivated
export function deactivate() {}
