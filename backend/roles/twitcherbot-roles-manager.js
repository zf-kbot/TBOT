"use strict";

const twitcherbotRoles = require("../../shared/twitcherbot-roles");

const activeChatUsers = require("../chat/chat-listeners/active-user-handler");

function userIsInTwitchbotRole(role, username) {
    switch (role.id) {
        case "ActiveChatters":
            return activeChatUsers.userIsActive(username);
        default:
            return false;
    }
}

function getAllTwitchbotRolesForViewer(username) {
    const roles = twitcherbotRoles.getTwitchbotRoles();
    return roles
        .filter(r => userIsInTwitchbotRole(r, username) !== false)
        .map(r => {
            return {
                id: r.id,
                name: r.name
            };
        });
}

exports.getAllTwitchbotRolesForViewer = getAllTwitchbotRolesForViewer;









