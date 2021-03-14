import * as vscode from "vscode";
import * as fontList from "font-list";
import { StatusManager } from "./StatusManager";
import { RewardsManager } from "./RewardsManager";
import { AuthManager } from "./AuthManager";

class Extension {
  declare authManager;
  declare statusManager;
  declare rewardsManager;

  constructor(context: vscode.ExtensionContext) {
    this.statusManager = new StatusManager();
    this.rewardsManager = new RewardsManager(this.statusManager);
    this.authManager = new AuthManager();

    this.authManager.onAuthChange(() => {
      // Re-setup the rewards manager whenever the auth changes:
      this.rewardsManager.setup();
    });

    this.rewardsManager.register(
      {
        title: "Change Font",
        prompt: "What font do you want?",
        userInputRequired: true,
      },
      async (message) => {
        const fonts = await fontList.getFonts();

        const font = fonts.find(
          (el) =>
            el.toLowerCase().replace(/["']/g, "") ===
            message.message.toLowerCase().replace(/["']/g, "")
        );

        if (font) {
          vscode.workspace.getConfiguration().update("editor.fontFamily", font);
          vscode.window.showInformationMessage(
            `${message.userDisplayName} changed font to ${font}`
          );
          return "FULFILLED";
        } else {
          vscode.window.showInformationMessage(
            `Twitch Controller: "${message.message}" does not exist`
          );
          return "CANCELED";
        }
      }
    );

    this.rewardsManager.register(
      {
        title: "Enhance",
        prompt: "E N H A N C E",
      },
      async () => {
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

        return "FULFILLED";
      }
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("font-changer.signInTwitch", () =>
        this.authManager.signIn()
      ),

      vscode.commands.registerCommand("font-changer.signOutTwitch", () =>
        this.authManager.signOut()
      )
    );
  }

  async deactivate() {
    await this.authManager.signOut();
  }
}

let extension: Extension;
export async function activate(context: vscode.ExtensionContext) {
  extension = new Extension(context);
}

// this method is called when your extension is deactivated
export async function deactivate() {
  await extension.deactivate();
}
