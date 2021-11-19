"use strict";
const frontendCommunicator = require('../../common/frontend-communicator');
/** 考虑集成webpack后，再上线该功能
const { ApiClient } = require('twitch');
const twitchAuth = require("../../auth/twitch-auth");
const { ClientCredentialsAuthProvider } = require('twitch-auth');
const { EventSubListener } = require('twitch-eventsub');
const { NgrokAdapter } = require('twitch-eventsub-ngrok');
const logger = require("../../logwrapper");
const accountAccess = require("../../common/account-access");

let listeners = [];
let apiClient;
 */

async function deleteListeners() {
    /**
    if (apiClient) {
        logger.info("delete eventsub listeners");
        await apiClient.helix.eventSub.deleteAllSubscriptions();
    }
    */
}

async function startListening(init = true) {
    /**
    const streamer = accountAccess.getAccounts().streamer;

    const clientId = twitchAuth.TWITCH_CLIENT_ID;
    const clientSecret = twitchAuth.TWITCH_CLIENT_SECRET;
    const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret);
    apiClient = new ApiClient({ authProvider });
    apiClient.helix.eventSub.getSubscriptions().then((value) => {
        logger.info('subscriptions.total', value.total);
    });
    if (init) {
        // 删除该client下原订阅
        deleteListeners();
    }
    const listener = new EventSubListener(apiClient, new NgrokAdapter());
    await listener.listen();

    // 频道更新监听
    const channelUpdateListener = await listener.subscribeToChannelUpdateEvents(streamer.userId, () => {
        frontendCommunicator.send("channel-info-update");
    });
    listeners.push(channelUpdateListener);
    */
}

frontendCommunicator.on("start-eventsub-listening", () => {
    // startListening();
});
exports.startListening = startListening;
exports.deleteListeners = deleteListeners;