"use strict";

const accountAccess = require("../../common/account-access");

const twitchApi = require("../client");
const { TwitchAPICallType } = require("twitch/lib");

const NodeCache = require("node-cache");

const userRoleCache = new NodeCache({ stdTTL: 30, checkperiod: 5 });

const profileManager = require("../../../backend/common/profile-manager");
const logger = require("../../logwrapper");
//kraken api替换为helix，对应的chat role需进行相应的调整
/** @type {string[]} */
let vips = [];
/**
 * @param {string[]} usersInVipRole
 * @return {void}
 */
const loadUsersInVipRole = (usersInVipRole) => {
    vips = usersInVipRole;
};

/**
 * @param {string} username
 * @return {void}
 */
const addVipToVipList = (username) => {
    vips.push(username);
};

/**
 * @param {string} username
 * @return {void}
 */
const removeVipFromVipList = (username) => {
    vips = vips.filter(vip => vip !== username);
};

async function getUserChatInfo(userId) {
    const client = twitchApi.getClient();


    const chatUser = await client.helix.users.getUserById(userId);

    return chatUser;
}

async function getUserChatInfoByName(username) {
    const client = twitchApi.getClient();
    try {
        const user = await client.helix.users.getUserByName(username);
        return getUserChatInfo(user.id);
    } catch (error) {
        return null;
    }
}

async function getUserSubInfo(userId) {
    const client = twitchApi.getClient();
    const streamer = accountAccess.getAccounts().streamer;
    const subInfo = await client.helix.subscriptions.getSubscriptionForUser(streamer.userId, userId);

    return subInfo;
}

async function getUserSubInfoByName(username) {
    try {
        const client = twitchApi.getClient();
        const user = await client.helix.users.getUserByName(username);

        return getUserSubInfo(user.id);
    } catch (error) {
        return null;
    }
}

async function getUserSubscriberRole(userIdOrName) {
    const isName = isNaN(userIdOrName);

    const client = twitchApi.getClient();
    const userId = isName ? (await client.helix.users.getUserByName(userIdOrName)).id : userIdOrName;

    const streamer = accountAccess.getAccounts().streamer;
    const subInfo = await client.helix.subscriptions.getSubscriptionForUser(streamer.userId, userId);

    if (subInfo == null || subInfo.tier == null) {
        return null;
    }

    let role = '';
    switch (subInfo.tier) {
    case "1000":
        role = "tier1";
        break;
    case "2000":
        role = "tier2";
        break;
    case "3000":
        role = "tier3";
        break;
    }

    return role;
}
function getDataFile(filePath) {
    return profileManager.getJsonDbInProfile(filePath);
}
function getDataMsgs(filePath, path) {
    try {
        let data = getDataFile(filePath).getData(path);
        return data ? data : {};
    } catch (err) {
        return {};
    }
}
function isBot(userId) {
    let twitchInsightBot = getDataMsgs('/data/twitchinsightbot', '/twitchbot');
    if (twitchInsightBot.hasOwnProperty(userId)) {
        return true;
    }
    return false;
}
async function getUsersChatRoles(userIdOrName = "") {

    userIdOrName = userIdOrName.toLowerCase();

    /**@type {string[]} */
    const cachedRoles = userRoleCache.get(userIdOrName);

    if (cachedRoles != null) {
        return cachedRoles;
    }

    const isName = isNaN(userIdOrName);

    const userChatInfo = isName ?
        (await getUserChatInfoByName(userIdOrName)) :
        (await getUserChatInfo(userIdOrName));

    const roles = [];
    try {
        const client = twitchApi.getClient();
        const username = isName ? userIdOrName : (await client.helix.users.getUserById(userIdOrName)).name;

        //添加broadcast类别
        const streamer = accountAccess.getAccounts().streamer;
        if (!userIdOrName || userIdOrName === streamer.userId || userIdOrName === streamer.username) {
            roles.push("broadcaster");
        }

        //添加sub类别
        if (streamer.broadcasterType !== "") {
            const subscriberRole = await getUserSubscriberRole(userIdOrName);
            if (subscriberRole != null) {
                roles.push("sub");
                roles.push(subscriberRole);
            }
        }

        //添加vip
        if (vips.some(v => v.toLowerCase() === username)) {
            roles.push("vip");
        }

        //添加mod
        const moderators = (await client.helix.moderation.getModerators(streamer.userId)).data;
        if (moderators.some(m => m.userName === username)) {
            roles.push("mod");
        }

        //添加bot
        if (isBot(userChatInfo._data.id)) {
            const userDatabase = require("../../database/userDatabase");
            await userDatabase.setChatUserBot(userChatInfo._data.id);
            roles.push("bot");
        }
        userRoleCache.set(userChatInfo._data.id, roles);
        userRoleCache.set(userChatInfo._data.login, roles);
        return roles;
    } catch (err) {
        logger.error("Failed to get user chat roles", err);
        return [];
    }
}

async function updateUserRole(userId, role, addOrRemove) {
    // eslint-disable-next-line no-warning-comments
    //TODO: Needs to be updated for twitch.
    return true;
}

async function getFollowDateForUser(username) {
    const client = twitchApi.getClient();
    const streamerData = accountAccess.getAccounts().streamer;

    const userId = (await client.helix.users.getUserByName(username)).id;

    const followerDate = (await client.helix.users.getFollowFromUserToBroadcaster(userId, streamerData.userId)).followDate;

    if (followerDate == null || followerDate.length < 1) {
        return null;
    }

    return new Date(followerDate);
}

async function doesUserFollowChannel(username, channelName) {
    if (username == null || channelName == null) return false;

    const client = twitchApi.getClient();

    if (username.toLowerCase() === channelName.toLowerCase()) {
        return true;
    }

    const userId = (await client.helix.users.getUserByName(username)).id;
    const channelId = (await client.helix.users.getUserByName(channelName)).id;

    if (userId == null || channelId == null) {
        return false;
    }

    const userFollow = await client.helix.users.userFollowsBroadcaster(userId, channelId);

    return userFollow != null;
}

async function toggleFollowOnChannel(channelIdToFollow, shouldFollow = true) {
    if (channelIdToFollow == null) return;

    const client = twitchApi.getClient();

    const user = await client.helix.users.getUserById(channelIdToFollow);

    if (shouldFollow) {
        await user.follow();
    } else {
        await user.unfollow();
    }
}

exports.getUserChatInfoByName = getUserChatInfoByName;
exports.getUsersChatRoles = getUsersChatRoles;
exports.getFollowDateForUser = getFollowDateForUser;
exports.toggleFollowOnChannel = toggleFollowOnChannel;
exports.updateUserRole = updateUserRole;
exports.doesUserFollowChannel = doesUserFollowChannel;
exports.loadUsersInVipRole = loadUsersInVipRole;
exports.addVipToVipList = addVipToVipList;
exports.removeVipFromVipList = removeVipFromVipList;
