"use strict";

const frontendCommunicator = require("../../common/frontend-communicator");
const commandHandler = require("../commands/commandHandler");
const chatHelpers = require("../chat-helpers");
const activeUserHandler = require("./active-user-handler");
const accountAccess = require("../../common/account-access");
const chatModerationManager = require("../moderation/chat-moderation-manager");
const twitchEventsHandler = require("../../events/twitch-events");
const users = require("../../twitch-api/resource/users");
const logger = require("../../logwrapper");
const twitchApi = require("../../twitch-api/client");
const events = require("events");

exports.events = new events.EventEmitter();

/** @arg {import('twitch-chat-client/lib/ChatClient').default} botChatClient */
exports.setupBotChatListeners = (botChatClient) => {
    botChatClient.onWhisper(async (_user, messageText, msg) => {
        const twitcherbotChatMessage = await chatHelpers.buildTwitchbotChatMessage(msg, messageText, true);
        commandHandler.handleChatMessage(twitcherbotChatMessage);
    });
};

const HIGHLIGHT_MESSAGE_REWARD_ID = "highlight-message";

async function addOrRemoveUserRole(userName, userRole, isAdd) {
    //1.通过用户名查找用户id
    let userId;
    const userDatabase = require("../../database/userDatabase");
    let allUsersDbInfo = await userDatabase.getAllUsers();
    try {
        for (let i = 0; i < allUsersDbInfo.length; i++) {
            if (userName === allUsersDbInfo[i].displayName) {
                userId = allUsersDbInfo[i]._id;
                break;
            }
        }
    } catch {
        userId = 0;
        logger.error("Failed to get userId by userName");
    }
    //2.通过用户id更新用户twitchRole状态
    if (userId) {
        if (isAdd) {
            userDatabase.addUserRoleInfo(userId, userRole);
        } else {
            userDatabase.removeUserRoleInfo(userId, userRole);
        }

    }
}

/** @arg {import('twitch-chat-client/lib/ChatClient').ChatClient} streamerChatClient */
exports.setupChatListeners = (streamerChatClient) => {
    const client = twitchApi.getClient();
    streamerChatClient.onPrivmsg(async (_channel, user, messageText, msg) => {
        const twitcherbotChatMessage = await chatHelpers.buildTwitchbotChatMessage(msg, messageText);
        try {
            await chatModerationManager.moderateMessage(twitcherbotChatMessage);
        } catch (error) {
            logger.error("chatModerationManager moderateMessage error", error);
        }
        // send to the frontend
        if (twitcherbotChatMessage.isHighlighted) {
            twitcherbotChatMessage.customRewardId = HIGHLIGHT_MESSAGE_REWARD_ID;
            frontendCommunicator.send("twitch:chat:rewardredemption", {
                id: HIGHLIGHT_MESSAGE_REWARD_ID,
                messageText: twitcherbotChatMessage.rawText,
                user: {
                    id: twitcherbotChatMessage.userId,
                    username: twitcherbotChatMessage.username
                },
                reward: {
                    id: HIGHLIGHT_MESSAGE_REWARD_ID,
                    name: "Highlight Message",
                    cost: 0,
                    imageUrl: "https://static-cdn.jtvnw.net/automatic-reward-images/highlight-4.png"
                }
            });
        }
        frontendCommunicator.send("twitch:chat:message", twitcherbotChatMessage);
        exports.events.emit("chat-message", twitcherbotChatMessage);

        commandHandler.handleChatMessage(twitcherbotChatMessage);

        activeUserHandler.addActiveUser(msg.userInfo, true);

        twitchEventsHandler.viewerArrived.triggerViewerArrived(msg.userInfo.displayName);

        const { streamer, bot } = accountAccess.getAccounts();
        if (user !== streamer.username && user !== bot.username) {
            const timerManager = require("../../timers/timer-manager");
            timerManager.incrementChatLineCounters();
        }

        twitchEventsHandler.chatMessage.triggerChatMessage(twitcherbotChatMessage);
    });

    streamerChatClient.onWhisper(async (_user, messageText, msg) => {
        const twitcherbotChatMessage = await chatHelpers.buildTwitchbotChatMessage(msg, messageText, true);

        commandHandler.handleChatMessage(twitcherbotChatMessage);

        frontendCommunicator.send("twitch:chat:message", twitcherbotChatMessage);
    });

    streamerChatClient.onAction(async (_channel, _user, messageText, msg) => {
        const twitcherbotChatMessage = await chatHelpers.buildTwitchbotChatMessage(msg, messageText, false, true);
        frontendCommunicator.send("twitch:chat:message", twitcherbotChatMessage);

        twitchEventsHandler.chatMessage.triggerChatMessage(twitcherbotChatMessage);

        twitchEventsHandler.viewerArrived.triggerViewerArrived(msg.userInfo.displayName);
    });

    streamerChatClient.onMessageRemove((_channel, messageId) => {
        frontendCommunicator.send("twitch:chat:message:deleted", messageId);
    });

    streamerChatClient.onHosted((_, byChannel, auto, viewers) => {
        twitchEventsHandler.host.triggerHost(byChannel, auto, viewers);
        const logger = require("../../logwrapper");
        logger.debug(`Host triggered by ${byChannel}. Is auto: ${auto}`);
    });

    streamerChatClient.onResub(async (_channel, _user, subInfo, msg) => {
        try {
            const twitcherbotChatMessage = await chatHelpers.buildTwitchbotChatMessage(msg, subInfo.message);

            frontendCommunicator.send("twitch:chat:message", twitcherbotChatMessage);

            exports.events.emit("chat-message", twitcherbotChatMessage);
        } catch (error) {
            logger.error("Failed to parse resub message", error);
        }
    });

    streamerChatClient.onCommunitySub((_channel, _user, subInfo, msg) => {
        twitchEventsHandler.giftSub.triggerCommunitySubGift(subInfo.gifterDisplayName,
            subInfo.plan, subInfo.count);
    });

    streamerChatClient.onRaid((_channel, _username, raidInfo) => {
        twitchEventsHandler.raid.triggerRaid(raidInfo.displayName, raidInfo.viewerCount);
    });

    streamerChatClient.onBan((_, username) => {
        twitchEventsHandler.viewerBanned.triggerBanned(username);
    });

    streamerChatClient.onTimeout((_, username, duration) => {
        twitchEventsHandler.viewerTimeout.triggerTimeout(username, duration);
    });

    streamerChatClient._onVipResult(async(_, username) => {
        users.addVipToVipList(username);
        addOrRemoveUserRole(username, 'vip', true);
    });
    streamerChatClient._onUnvipResult(async(_, username) => {
        users.removeVipFromVipList(username);
        addOrRemoveUserRole(username, 'vip', false);
    });
    //对mod进行监听处理
    streamerChatClient._onModResult(async(_, username) => {
        addOrRemoveUserRole(username, 'mod', true);
    });
    streamerChatClient._onUnmodResult(async(_, username) => {
        addOrRemoveUserRole(username, 'mod', false);
    });
};