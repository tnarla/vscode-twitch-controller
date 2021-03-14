import * as vscode from "vscode";
import { ApiClient, HelixCustomReward } from "twitch";
import { PubSubClient, PubSubRedemptionMessage } from "twitch-pubsub-client";
import { getAPIClient } from "./utils/twitch";
import { StatusManager } from "./StatusManager";

type RewardHandler = (
  message: PubSubRedemptionMessage
) => Promise<"CANCELED" | "FULFILLED">;

export class RewardsManager {
  private declare setupPromise;
  private declare statusManger: StatusManager;
  private declare pubSubClient?: PubSubClient;
  private declare userId?: string;
  private declare apiClient?: ApiClient | null;
  private declare rewards: HelixCustomReward[];
  private declare registered: Map<string, RewardHandler>;

  constructor(statusManager: StatusManager) {
    this.statusManger = statusManager;
    this.rewards = [];
    this.registered = new Map();
    this.setupPromise = this.setup();
  }

  async setup() {
    this.apiClient = await getAPIClient();
    if (!this.apiClient) {
      this.statusManger.hide();
      return null;
    }

    this.statusManger.update("Connecting...");

    this.pubSubClient = new PubSubClient();
    this.userId = await this.pubSubClient.registerUserListener(this.apiClient);
    this.rewards = await this.apiClient.helix.channelPoints.getCustomRewards(
      this.userId
    );

    await this.pubSubClient.onRedemption(this.userId, async (message) => {
      const handler = this.registered.get(message.rewardName);
      if (!handler) {
        return;
      }

      const status = await handler(message);

      await this.apiClient!.helix.channelPoints.updateRedemptionStatusByIds(
        this.userId!,
        message.rewardId,
        [message.id],
        status
      );
    });

    this.statusManger.update('Connected ✅')
  }

  async register(
    reward: {
      title: string;
      prompt: string;
      userInputRequired?: true;
    },
    callback: RewardHandler
  ) {
    await this.setupPromise;
    if (!this.apiClient || !this.userId) return null;

    let customReward = this.rewards.find(
      (rewards) => rewards.title === reward.title
    );

    if (!customReward) {
      const response = await vscode.window.showInformationMessage(
        `Custom reward "${reward.title}" was not found. Do you want to create it?`,
        "Yes",
        "No"
      );

      if (response === "No") {
        vscode.window.showErrorMessage(
          `Unable to setup custom reward "${reward.title}".`
        );
        return;
      }

      customReward = await this.apiClient.helix.channelPoints.createCustomReward(
        this.userId,
        {
          title: reward.title,
          prompt: reward.prompt,
          cost: 1,
          isEnabled: true,
          userInputRequired: reward.userInputRequired,
        }
      );
    }

    this.registered.set(reward.title, callback);
  }
}
