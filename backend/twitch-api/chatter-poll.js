"use strict";

const accountAccess = require("../common/account-access");

const profileManager = require("../common/profile-manager");
const twitchApi = require("./client");

// every 5 mins
const POLL_INTERVAL = 15000;

let chatterPollIntervalId;


function getViewerDataFile() {
    return profileManager.getJsonDbInProfile('/viewdata');
}

function pushViewerDataToFile(path, data) {
    try {
        getViewerDataFile().push(path, data, true);
    } catch (err) { } //eslint-disable-line no-empty
}

// 保存到本地
function saveViewerDataMsg(path, msg) {
    pushViewerDataToFile(path, msg);
}

// 保存到本地
function getViewerDataMsgs(path) {
    try {
        let data = getViewerDataFile().getData(path);
        return data ? data : [];
    } catch (err) {
        return [];
    }
}

// function pushViewerDataMsg(message) {
//     let currentDate = new Date();
//     let path = `${currentDate.getDate()} ${currentDate.getMonth()}, ${currentDate.getFullYear()}`
//     saveViewerDataMsg('/' + path, msg);
// };

function loadViewerDataMsgs() {
    historyQueue = getViewerDataMsgs('/msgs');
};



function clearPollInterval() {
    if (chatterPollIntervalId != null) {
        clearTimeout(chatterPollIntervalId);
    }
}

async function handleChatters() {
    const streamer = accountAccess.getAccounts().streamer;
    const client = twitchApi.getClient();

    if (client == null || !streamer.loggedIn) return;

    const logger = require("../logwrapper");

    logger.debug("Getting connected chat users...");

    const chatters = await client.unsupported.getChatters(streamer.username);

    // let currentDate = new Date();
    let path = `${new Date().getFullYear()} ${new Date().getMonth()+1} ${new Date().getDate()}`;
    let oldMax = getViewerDataMsgs('/'+path);
    saveViewerDataMsg('/'+path, chatters.allChatters.length > oldMax ? chatters.allChatters.length : oldMax);
    logger.debug(`There are ${chatters ? chatters.allChatters.length : 0} online chat users.`);

    if (chatters == null || chatters.allChatters.length < 1) return;

    const activeChatUserHandler = require("../chat/chat-listeners/active-user-handler");

    for (const username of chatters.allChatters) {
        await activeChatUserHandler.addOnlineUser(username);
    }
}

exports.startChatterPoll = () => {
    clearPollInterval();
    handleChatters();
    chatterPollIntervalId = setInterval(handleChatters, POLL_INTERVAL);
};

exports.stopChatterPoll = () => {
    clearPollInterval();
};