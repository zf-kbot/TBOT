"use strict";
const logger = require("../logwrapper");
const EventEmitter = require("events");
const { ChatClient } = require("twitch-chat-client");
const twitchClient = require("../twitch-api/client");
const accountAccess = require("../common/account-access");
const frontendCommunicator = require("../common/frontend-communicator");
const chatHelpers = require("./chat-helpers");
const twitchChatListeners = require("./chat-listeners/twitch-chat-listeners");
const followPoll = require("../twitch-api/follow-poll");
const chatterPoll = require("../twitch-api/chatter-poll");
const commandHandler = require("./commands/commandHandler");
const activeUserHandler = require("./chat-listeners/active-user-handler");
const users = require("../twitch-api/resource/users");
//设置目前最新的角色信息
async function setUserTwitchRole(streamer, vipNames, modNames) {
    const client = twitchClient.getClient();
    const userDatabase = require("../database/userDatabase");
    //重置下所有角色
    let userIdsToRest = [];
    let userToResetArray = await userDatabase.getIdsToResetRoles();
    for (let i = 0; i < userToResetArray.length; i++) {
        userIdsToRest.push(userToResetArray[i]._id);
    }
    //发送请求，获取vips， mods和subscribers
    let vipIds = [];
    let modIds = [];
    //通过vipNames获取vipIds 以及modNames获取modIds
    let allUsersDbInfo = await userDatabase.getAllUsers();
    try {
        for (let i = 0; i < allUsersDbInfo.length; i++) {
            if (vipNames.includes(allUsersDbInfo[i].displayName)) {
                vipIds.push(allUsersDbInfo[i]._id);
            }
            if (modNames.includes(allUsersDbInfo[i].displayName)) {
                modIds.push(allUsersDbInfo[i]._id);
            }
        }
    } catch {
        logger.error("Failed to get vipIds and modIds");
    }

    //获取subscribers的ids
    let subscribers = [];//默认为空
    let subscriberIds = [];
    try {
        subscribers = await client.helix.subscriptions.getSubscriptionsPaginated(streamer.channelId).getAll();
        for (let i = 0; i < subscribers.length; i++) {
            subscriberIds.push(subscribers[i].userId);
        }
    } catch {
        subscriberIds = [];
        logger.error("Failed to get subscriberIds by subscribers");
    }

    //vip,mod和subscriber的Id并集
    let vipAndModOAndSubscriberIds = vipIds.concat(modIds).concat(subscriberIds.filter(function(v) {
        return vipIds.concat(modIds).indexOf(v) === -1;
    }));
    //需要重置为regular的用户
    let userIdsToRestToRegular = userIdsToRest.filter(item => !vipAndModOAndSubscriberIds.includes(item));
    if (userIdsToRestToRegular.length > 0) {
        for (let i = 0; i < userIdsToRestToRegular.length; i++) {
            let userRoleInfo = {
                id: userIdsToRestToRegular[i],
                roles: []
            };
            //更新用户角色
            userDatabase.updateUserRoles(userRoleInfo);
        }
    }
    //需要设置为vip mod 和subscriber的用户
    for (let i = 0; i < vipAndModOAndSubscriberIds.length; i++) {
        let roles = [];
        if (vipIds.includes(vipAndModOAndSubscriberIds[i])) {
            roles.push('vip');
        }
        if (modIds.includes(vipAndModOAndSubscriberIds[i])) {
            roles.push('mod');
        }
        if (subscriberIds.includes(vipAndModOAndSubscriberIds[i])) {
            roles.push('subscriber');
        }
        let userRoleInfo = {
            id: vipAndModOAndSubscriberIds[i],
            roles: roles
        };
        //更新用户角色
        userDatabase.updateUserRoles(userRoleInfo);
    }
}
/**@extends NodeJS.EventEmitter */
class TwitchChat extends EventEmitter {

    constructor() {
        super();

        /** @type {ChatClient} */
        this._streamerChatClient = null;

        /** @type {ChatClient} */
        this._botChatClient = null;
    }

    /**
     * Whether or not the streamer is currently connected
     */
    chatIsConnected() {
        return this._streamerChatClient != null && this._streamerChatClient.isConnected;
    }

    /**
     * Disconnects the streamer and bot from chat
     */
    async disconnect(emitDisconnectEvent = true, manual = true) {
        if (this._streamerChatClient != null) {
            await this._streamerChatClient.quit();
            this._streamerChatClient = null;
        }
        if (this._botChatClient != null && this._botChatClient.isConnected) {
            await this._botChatClient.quit();
            this._botChatClient = null;
        }
        if (emitDisconnectEvent) {
            this.emit("disconnected", { manual: manual });
        }
        followPoll.stopFollowPoll();
        chatterPoll.stopChatterPoll();

        activeUserHandler.clearAllActiveUsers();

        const userDatabase = require("../database/userDatabase");
        await userDatabase.setAllUsersOffline();
        await userDatabase.setAllUsersOldViewer();
    }

    /**
     * Connects the streamer and bot to chat
     */
    async connect() {
        const streamer = accountAccess.getAccounts().streamer;
        if (!streamer.loggedIn) return;

        const client = twitchClient.getClient();
        if (client == null) return;

        this.emit("connecting");
        await this.disconnect(false);

        try {
            this._streamerChatClient = await ChatClient.forTwitchClient(client, {
                requestMembershipEvents: true
            });

            this._streamerChatClient.onRegister(() => this._streamerChatClient.join(streamer.username));

            this._streamerChatClient.onConnect(() => {
                this.emit("connected");
            });

            this._streamerChatClient.onAnyMessage((message) => {
                if (message.constructor.name === "UserState") {
                    const userData = message.tags;

                    const color = userData.get("color");
                    const badges = new Map(userData.get("badges").split(',').map(b => b.split('/', 2)));

                    chatHelpers.setStreamerData({
                        color,
                        badges
                    });
                }
            });

            let that = this;
            this._streamerChatClient.onDisconnect(async function(manual, reason) {
                if (!manual) {
                    logger.error("Chat not disconnected", manual, reason);
                    // 无需调用断连操作，twitch-chat-client内部有重连机制
                    // await that.disconnect(true, manual);
                    // that.emit("need-reconnect");
                }
            });

            await this._streamerChatClient.connect();

            await chatHelpers.handleChatConnect();

            twitchChatListeners.setupChatListeners(this._streamerChatClient);

            followPoll.startFollowPoll();
            chatterPoll.startChatterPoll();

            const vips = await this._streamerChatClient.getVips(streamer.username);
            //vipNames的参数有问题，最后一个用户的Name会多一个"."  需要去除掉
            //处理vipNames的最后一个值的内容，替换其中的“.”
            if (vips.length > 0) {
                vips[vips.length - 1] = vips[vips.length - 1].replace(".", "");
            }

            users.loadUsersInVipRole(vips);
            let modNames = await this._streamerChatClient.getMods(streamer.username);
            //连接时，更新userdb中最新的vip,mod和subscriber的信息
            await setUserTwitchRole(streamer, vips, modNames);
        } catch (error) {
            logger.error("Chat connect error", error);
            await this.disconnect();
        }

        try {
            this._botChatClient = await ChatClient.forTwitchClient(twitchClient.getBotClient(), {
                requestMembershipEvents: true
            });

            this._botChatClient.onRegister(() => this._botChatClient.join(streamer.username));

            twitchChatListeners.setupBotChatListeners(this._botChatClient);

            await this._botChatClient.connect();
        } catch (error) {
            logger.error("Error joining streamers chat channel with Bot account", error);
        }
    }

    /**
     * Sends a chat message to the streamers chat (INTERNAL USE ONLY)
     * @param {string} message The message to send
     * @param {string} accountType The type of account to whisper with ('streamer' or 'bot')
     */
    async _say(message, accountType) {
        const chatClient = accountType === 'bot' ? this._botChatClient : this._streamerChatClient;
        try {
            logger.debug(`Sending message as ${accountType}.`);

            const streamer = accountAccess.getAccounts().streamer;
            chatClient.say(streamer.username, message);

            if (accountType === 'streamer' && (!message.startsWith("/") || message.startsWith("/me"))) {
                const twitcherbotChatMessage = await chatHelpers.buildTwitchbotChatMessageFromText(message);
                await activeUserHandler.addActiveUser({
                    userId: twitcherbotChatMessage.userId,
                    userName: twitcherbotChatMessage.username,
                    displayName: twitcherbotChatMessage.username
                }, true, false);
                //commandHandler.handleChatMessage(twitcherbotChatMessage);
                frontendCommunicator.send("twitch:chat:message", twitcherbotChatMessage);
                twitchChatListeners.events.emit("chat-message", twitcherbotChatMessage);
            }
        } catch (error) {
            logger.error(`Error attempting to send message with ${accountType}`, error);
        }
    }

    /**
     * Sends a whisper to the given user (INTERNAL USE ONLY)
     * @param {string} message The message to send
     * @param {string} accountType The type of account to whisper with ('streamer' or 'bot')
     */
    async _whisper(message, username = "", accountType) {
        const chatClient = accountType === 'bot' ? this._botChatClient : this._streamerChatClient;
        try {
            logger.debug(`Sending whisper as ${accountType} to ${username}.`);

            const streamer = accountAccess.getAccounts().streamer;
            const whisperMessage = `/w @${username.replace("@", "")} ${message}`;
            chatClient.say(streamer.username, whisperMessage);
            //chatClient.whisper(username, message);
        } catch (error) {
            logger.error(`Error attempting to send whisper with ${accountType}`, error);
        }
    }

    /**
     * Sends the message as the bot if available, otherwise as the streamer.
     * If a username is provided, the message will be whispered.
     * If the message is too long, it will be automatically broken into multiple fragments and sent individually.
     *
     * @param {string} message The message to send
     * @param {string} [username] If provided, message will be whispered to the given user.
     * @param {string} [accountType] Which account to chat as. Defaults to bot if available otherwise, the streamer.
     */
    sendChatMessage(message, username, accountType) {
        if (message == null) return null;

        // Normalize account type
        if (accountType != null) {
            accountType = accountType.toLowerCase();
        }

        const shouldWhisper = username != null && username.trim() !== "";

        const botAvailable = accountAccess.getAccounts().bot.loggedIn && this._botChatClient && this._botChatClient.isConnected;
        if (accountType == null) {
            accountType = botAvailable && !shouldWhisper ? "bot" : "streamer";
        } else if (accountType === "bot" && !botAvailable) {
            accountType = "streamer";
        }


        // split message into fragments that don't exceed the max message length
        const messageFragments = message.match(/[\s\S]{1,500}/g)
            .map(mf => mf.trim())
            .filter(mf => mf !== "");

        // Send all message fragments
        for (let fragment of messageFragments) {
            if (shouldWhisper) {
                this._whisper(fragment, username, accountType);
            } else {
                this._say(fragment, accountType);
            }
        }
    }

    deleteMessage(messageId) {
        const streamer = accountAccess.getAccounts().streamer;
        if (this._streamerChatClient == null || !streamer.loggedIn) return;
        this._streamerChatClient.deleteMessage(streamer.username, messageId);
    }

    mod(username) {
        if (username == null) return;

        const streamer = accountAccess.getAccounts().streamer;

        return this._streamerChatClient.mod(streamer.username, username);
    }

    unmod(username) {
        if (username == null) return;

        const streamer = accountAccess.getAccounts().streamer;

        return this._streamerChatClient.unmod(streamer.username, username);
    }

    ban(username, reason) {
        if (username == null) return;

        const streamer = accountAccess.getAccounts().streamer;

        this._streamerChatClient.ban(streamer.username, username, reason);
    }

    unban(username) {
        if (username == null) return;

        const streamer = accountAccess.getAccounts().streamer;

        this._streamerChatClient.say(`#${streamer.username.replace("#", "")}`, `/unban ${username}`);
    }

    addVip(username) {
        if (username == null) return;

        const streamer = accountAccess.getAccounts().streamer;

        return this._streamerChatClient.addVip(streamer.username, username);
    }

    removeVip(username) {
        if (username == null) return;

        const streamer = accountAccess.getAccounts().streamer;

        return this._streamerChatClient.removeVip(streamer.username, username);
    }

    clearChat() {
        if (this._streamerChatClient == null) return;
        this._streamerChatClient.clear();
    }

    purgeUserMessages(username, reason = "") {
        const streamer = accountAccess.getAccounts().streamer;
        if (this._streamerChatClient == null || !streamer.loggedIn) return;
        this._streamerChatClient.purge(streamer.username, username, reason);
    }

    timeoutUser(username, duration = 600, reason = "") {
        const streamer = accountAccess.getAccounts().streamer;
        if (this._streamerChatClient == null || !streamer.loggedIn) return;
        //duration是int类型，这里加转换是如果有老用户这里强制转一下int,新用户会在设置modal的输入框加number类型限制
        this._streamerChatClient.timeout(streamer.username, username, parseInt(duration), reason);
    }

    getViewerList() {
        // eslint-disable-next-line no-warning-comments
        //TODO: Needs updated for twitch.
        let users = [];
        return users;
    }
}

const twitchChat = new TwitchChat();

// main window传递消息给popout window进行同步chatqueue
frontendCommunicator.on("sync-ipc-chat-queue", () => {
    const { chatBox } = require("../app-management/electron/window-management");
    if (chatBox != null) {
        try {
            chatBox.webContents.send("sync-ipc-chat-queue");
        // eslint-disable-next-line no-empty
        } catch (error) {}
    }
});

// main window传递消息给popout window进行同步连接状态
frontendCommunicator.on("sync-ipc-chat-connected-status", (status) => {
    const { chatBox } = require("../app-management/electron/window-management");
    if (chatBox != null) {
        chatBox.webContents.send("sync-ipc-chat-connected-status", status);
    }
});

frontendCommunicator.on("send-chat-message", async sendData => {
    const { message, accountType } = sendData;

    // Run commands from twitchbotchat.
    if (accountType === "Streamer") {
        let twitcherbotMessage = await chatHelpers.buildTwitchbotChatMessageFromText(message);
        commandHandler.handleChatMessage(twitcherbotMessage);

        const twitchEventsHandler = require("../events/twitch-events");
        twitchEventsHandler.chatMessage.triggerChatMessage(twitcherbotMessage);
    }

    twitchChat.sendChatMessage(message, null, accountType);
});

frontendCommunicator.on("delete-message", messageId => {
    twitchChat.deleteMessage(messageId);
});

frontendCommunicator.on("update-user-mod-status", data => {
    if (data == null) return;
    const { username, shouldBeMod } = data;
    if (username == null || shouldBeMod == null) return;

    if (shouldBeMod) {
        twitchChat.mod(username);
    } else {
        twitchChat.unmod(username);
    }
});

frontendCommunicator.on("update-user-banned-status", data => {
    if (data == null) return;
    const { username, shouldBeBanned } = data;
    if (username == null || shouldBeBanned == null) return;

    if (shouldBeBanned) {
        twitchChat.ban(username, "Banned via Twitchbot");
    } else {
        twitchChat.unban(username);
    }
});

module.exports = twitchChat;



