"use strict";
const logger = require("../../logwrapper");
const accountAccess = require("../../common/account-access");
const twitchClient = require("../client");
const profileManager = require("../../common/profile-manager");
const { PubSubClient } = require("twitch-pubsub-client");
function getSubOrGiftsubOrEventFile() {
    return profileManager.getJsonDbInProfile("/events/suborgiftsuborevent");
}

function pushDataToFile(path, data) {
    try {
        getSubOrGiftsubOrEventFile().push(path, data);
    } catch (err) {} //eslint-disable-line no-empty
}

/**@type {PubSubClient} */
let pubSubClient;

/**@type {Array<import("twitch-pubsub-client").PubSubListener>} */
let listeners = [];

/**
 *
 * @param {PubSubClient} pubSubClient
 */
async function removeListeners(pubSubClient) {
    if (pubSubClient) {
        let userListener;
        try {
            userListener = pubSubClient.getUserListener(accountAccess.getAccounts().streamer.userId);
        } catch (error) {
            console.log(error);
        }
        if (userListener) {
            for (const listener of listeners) {
                try {
                    await userListener.removeListener(listener);
                    await listener.remove();
                } catch (error) {
                    console.log(error);
                }
            }
        }
    } else {
        for (const listener of listeners) {
            try {
                await listener.remove();
            } catch (error) {
                logger.debug("failed to remove pubsub listener without client", error);
            }
        }
    }
    listeners = [];
}

async function disconnectPubSub() {
    await removeListeners(pubSubClient);
    try {
        if (pubSubClient && pubSubClient._rootClient && pubSubClient._rootClient.isConnected) {
            pubSubClient._rootClient.disconnect();
            logger.info("Disconnected from PubSub.");
        }
    } catch (err) {
        logger.debug("error disconnecting pubsub", err);
    }
}

async function createClient() {

    const streamer = accountAccess.getAccounts().streamer;

    await disconnectPubSub();

    logger.info("Connecting to Twitch PubSub...");

    pubSubClient = new PubSubClient();

    const apiClient = twitchClient.getClient();

    try {
        // throws error if one doesnt exist
        pubSubClient.getUserListener(streamer.userId);
    } catch (err) {
        await pubSubClient.registerUserListener(apiClient, streamer.userId);
    }

    await removeListeners(pubSubClient);

    try {
        const twitchEventsHandler = require('../../events/twitch-events');

        const redemptionListener = await pubSubClient.onRedemption(streamer.userId, (message) => {
            twitchEventsHandler.rewardRedemption.handleRewardRedemption(message);
        });

        listeners.push(redemptionListener);

        const whisperListener = await pubSubClient.onWhisper(streamer.userId, (message) => {
            logger.info("whisper", message);
            pushDataToFile("/whisper", message);
            twitchEventsHandler.whisper.triggerWhisper(message.senderName, message.text);
        });
        listeners.push(whisperListener);

        const bitsListener = await pubSubClient.onBits(streamer.userId, (event) => {
            logger.info("bits", event);
            pushDataToFile("/bits", event);
            twitchEventsHandler.cheer.triggerCheer(event.userName, event.isAnonymous, event.bits, event.totalBits, event.message);
        });
        listeners.push(bitsListener);

        const subsListener = await pubSubClient.onSubscription(streamer.userId, (subInfo) => {
            if (!subInfo.isGift) {
                logger.info("sub", subInfo);
                pushDataToFile("/sub", subInfo);
                twitchEventsHandler.sub.triggerSub(subInfo);
            } else {
                logger.info("giftsub", subInfo);
                pushDataToFile("/giftsub", subInfo);
                twitchEventsHandler.giftSub.triggerSubGift(subInfo);
            }
        });
        listeners.push(subsListener);
    } catch (err) {
        logger.error("Failed to connect to Twitch PubSub!", err);
        return;
    }

    logger.info("Connected to the Twitch PubSub!");
}

exports.createClient = createClient;
exports.disconnectPubSub = disconnectPubSub;
exports.removeListeners = removeListeners;

