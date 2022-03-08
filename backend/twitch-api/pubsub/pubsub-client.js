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
function getDataFile(filePath) {
    return profileManager.getJsonDbInProfile(filePath);
}

function pushDataToFile(filePath, path, data) {
    try {
        getDataFile(filePath).push(path, data, true);
    } catch (err) { }//eslint-disable-line no-empty
}

function saveDataMsgs(filePath, path, msg) {
    pushDataToFile(filePath, path, msg);
}

function getDataMsgs(filePath, path) {
    try {
        let data = getDataFile(filePath).getData(path);
        return data ? data : {};
    } catch (err) {
        return {};
    }
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
            let date = new Date(event._data.data.time);
            let path = `${date.getFullYear()} ${date.getMonth() + 1} ${date.getDate()}`;
            let bitsMessage = getDataMsgs("/data/achievement/bits", "/" + path);
            if ("bits" in bitsMessage && "userSubInfo" in bitsMessage) {
                bitsMessage.bits.push(event.bits);
                bitsMessage.userSubInfo.push({
                    userId: event.userId,
                    userName: event.userName,
                    bits: event.bits
                });
                saveDataMsgs("/data/achievement/bits", "/" + path, bitsMessage);
            } else {
                saveDataMsgs("/data/achievement/bits", "/" + path, {
                    "bits": [event.bits],
                    "userSubInfo": [{
                        userId: event.userId,
                        userName: event.userName,
                        bits: event.bits
                    }]
                });
            }
            twitchEventsHandler.cheer.triggerCheer(event.userName, event.isAnonymous, event.bits, event.totalBits, event.message);
            //触发bitsXP加经验
            let userxpdb = require("../../database/userXPDatabase");
            let jsonDataHelpers = require("../../../backend/common/json-data-helpers");
            let user = {
                _id: event.userId,
                username: event.userName,
                minutesInChannel: 0, //在followXP中触发初始化时使用
                chatMessages: 0, //在UserSubscriptionXP中触发初始化时使用
                isFollowed: false
            };
            //因为bitBonus默认值为0，不管是否存在，直接使用bitsBonus
            let bitsBonus = jsonDataHelpers.getNumberDataMsgs('/loyalty-community/loyalsetting', '/bonusSetting/bitBonus');
            userxpdb.updateUserbitXP(user, event.bits, false, bitsBonus);
        });
        listeners.push(bitsListener);

        const subsListener = await pubSubClient.onSubscription(streamer.userId, (subInfo) => {
            if (!subInfo.isGift) {
                logger.info("sub", subInfo);
                pushDataToFile("/sub", subInfo);
                let date = new Date(subInfo.time);
                let path = `${date.getFullYear()} ${date.getMonth() + 1} ${date.getDate()}`;
                let subsMessage = getDataMsgs("/data/achievement/subandgiftsub", "/" + path);
                const streak = subInfo.streakMonths || 1;
                if ("subscriptions" in subsMessage && "userSubInfo" in subsMessage) {
                    subsMessage.subscriptions.push(streak);
                    subsMessage.userSubInfo.push({
                        userId: subInfo.userId,
                        userName: subInfo.userName,
                        subscriptions: streak
                    });
                    saveDataMsgs("/data/achievement/subandgiftsub", "/" + path, subsMessage);
                } else {
                    saveDataMsgs("/data/achievement/subandgiftsub", "/" + path, {
                        "subscriptions": [streak],
                        "userSubInfo": [{
                            userId: subInfo.userId,
                            userName: subInfo.userName,
                            subscriptions: streak
                        }]
                    });
                }
                twitchEventsHandler.sub.triggerSub(subInfo);
            } else {
                logger.info("giftsub", subInfo);
                pushDataToFile("/giftsub", subInfo);
                let date = new Date(subInfo.time);
                let path = `${date.getFullYear()} ${date.getMonth() + 1} ${date.getDate()}`;
                let subsMessage = getDataMsgs("/data/achievement/subandgiftsub", "/" + path);
                const streak = subInfo.giftDuration || 1;
                if ("giftSubscriptions" in subsMessage && "userGiftSubInfo" in subsMessage) {
                    subsMessage.giftSubscriptions.push(streak);
                    subsMessage.userGiftSubInfo.push({
                        userId: subInfo.userId,
                        userName: subInfo.userName,
                        giftSubscriptions: streak
                    });
                    saveDataMsgs("/data/achievement/subandgiftsub", "/" + path, subsMessage);
                } else {
                    saveDataMsgs("/data/achievement/subandgiftsub", "/" + path, {
                        "giftSubscriptions": [streak],
                        "userGiftSubInfo": [{
                            userId: subInfo.userId,
                            userName: subInfo.userName,
                            giftSubscriptions: streak
                        }]
                    });
                }
                twitchEventsHandler.giftSub.triggerSubGift(subInfo);
            }
            //监听到有订阅，将添加订阅者的角色
            //1.通过用户id更新用户twitchRole状态
            if (subInfo.userId) {
                const userDatabase = require("../../database/userDatabase");
                userDatabase.addUserRoleInfo(subInfo.userId, 'subscriber');
            }
            //触发subscriber加经验
            let userxpdb = require("../../database/userXPDatabase");
            let jsonDataHelpers = require("../../../backend/common/json-data-helpers");
            let user = {
                _id: subInfo.userId,
                username: subInfo.userName,
                minutesInChannel: 0, //在UserSubscriptionXP中触发初始化时使用
                chatMessages: 0, //在UserSubscriptionXP中触发初始化时使用
                isFollowed: false
            };
            //因为subscriptionBonus默认值为0，不管是否存在，就直接使用其值
            let subscriptionBonus = jsonDataHelpers.getNumberDataMsgs('/loyalty-community/loyalsetting', '/bonusSetting/subscriptionBonus');
            userxpdb.updateUserSubscriptionXP(user, false, subscriptionBonus);
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

