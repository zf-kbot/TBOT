"use strict";

const eventManager = require("../../events/EventManager");

/**
 * @arg {import('../../chat/chat-helpers').TwitchbotChatMessage} twitcherbotChatMessage
 */
exports.triggerChatMessage = (twitcherbotChatMessage) => {
    eventManager.triggerEvent("twitch", "chat-message", {
        username: twitcherbotChatMessage.username,
        twitchUserRoles: twitcherbotChatMessage.roles,
        messageText: twitcherbotChatMessage.rawText,
        chatMessage: twitcherbotChatMessage
    });
};