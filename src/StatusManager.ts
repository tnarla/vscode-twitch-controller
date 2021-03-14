import * as vscode from "vscode";

export class StatusManager {
  declare statusBar;

  constructor() {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      0
    );
  }

  update(text: string, command?: string) {
    this.statusBar.text = `Twitch Controller: ${text}`;
    this.statusBar.command = command;
    this.statusBar.show();
  }

  hide() {
    this.statusBar.hide();
  }

  show() {
    this.statusBar.show();
  }
}
