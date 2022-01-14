"use strict";

const accountAccess = require("../common/account-access");

const profileManager = require("../common/profile-manager");
const twitchApi = require("./client");
const axios = require("axios").default;

// every 5 mins
const POLL_INTERVAL = 15000;

let chatterPollIntervalId;
let twitchInsightBotIntervalId;


function getViewerDataFile() {
    return profileManager.getJsonDbInProfile('/data/achievement/maxviewers');
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
        return data ? data : {};
    } catch (err) {
        return {};
    }
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
        return data ? data : [];
    } catch (err) {
        return [];
    }
}
async function getTwitchInsight() {
    let url = "https://api.twitchinsights.net/v1/bots/online";

    return await axios.get(url)
        .then(function (response) {
            // let advice = response.data.slip["advice"];
            // console.log("Advice: " + response);
            return response;
        })
        .catch(function (err) {
            // logger.debug(err);
            // renderWindow.webContents.send(
            //     "error",
            //     "Couldnt connect to the advice API. It may be down."
            // );
            return "[Error getting API response]";
        });
}
async function getUserIdsByUserNames(userNames) {
    const client = twitchApi.getClient();
    const userIds = await client.helix.users.getUsersByNames(userNames);
    for (let i = 0; i < userIds.length; i++) {
        let path = userIds[i].id;
        saveDataMsgs("/data/twitchinsightbot", "/twitchbot/" + path, {"id": userIds[i].id, "login": userIds[i]._data.login });
    }
}
function group(array, subGroupLength) {
    let index = 0;
    let newArray = [];
    while (index < array.length) {
        newArray.push(array.slice(index, index += subGroupLength));
    }
    return newArray;
}
function setTwitchInsightBotExpired() {
    saveDataMsgs("/data/twitchinsightbot", "/twitchbot/isExpired", true);
}

async function updateTwitchInsightBot() {
    //get twitchinsightbot.json
    let twitchInsightBot = getDataMsgs("/data/twitchinsightbot", "/twitchbot");

    //判断是否需要更新
    if (!twitchInsightBot.hasOwnProperty('isExpired') || twitchInsightBot.isExpired) {
        //向twitchinsight 发送请求
        let response = await getTwitchInsight();
        if (!twitchInsightBot.hasOwnProperty('isExpired')) {
            saveDataMsgs("/data/twitchinsightbot", "/twitchbot/isExpired", false);
        }
        let botsNameArray = response.data.bots.map(item => item[0]);
        //twitchapi一次最大接收100个names,将botsName划分成多个组
        let botsName = group(botsNameArray, 100);
        for (let i = 0; i < botsName.length; i++) {
            //通过用户名获取用户Id并将bot信息写入/data/twitchinsightbot
            await getUserIdsByUserNames(botsName[i]);
        }
        //设置为未过期
        saveDataMsgs("/data/twitchinsightbot", "/twitchbot/isExpired", false);
    }


}

function clearPollInterval() {
    if (chatterPollIntervalId != null) {
        clearTimeout(chatterPollIntervalId);
    }
    if (twitchInsightBotIntervalId != null) {
        clearTimeout(twitchInsightBotIntervalId);
    }
}

async function handleChatters() {
    const streamer = accountAccess.getAccounts().streamer;
    const client = twitchApi.getClient();
    //检测twitchinsight.json文件是否过期，如果过期就更新。
    updateTwitchInsightBot();
    if (client == null || !streamer.loggedIn) return;

    const logger = require("../logwrapper");

    logger.debug("Getting connected chat users...");

    const chatters = await client.unsupported.getChatters(streamer.username);

    let currentDate = new Date();
    //currentDate.getMonth()是从0开始计算月份
    let path = `${currentDate.getFullYear()} ${currentDate.getMonth() + 1} ${currentDate.getDate()}`;
    let viewerData = getViewerDataMsgs('/' + path);
    let oldMax = 0;
    if ("atTime" in viewerData && "newViewerNumber" in viewerData && "oldViewerNumber" in viewerData) {
        oldMax = viewerData.newViewerNumber + viewerData.oldViewerNumber;
    }
    if (chatters.allChatters.length > oldMax) {
        const userDatabase = require("../database/userDatabase");
        let newViewerNumber = await userDatabase.calNewViewer();
        let oldViewerNumber = await userDatabase.calOldViewer();
        let message = {
            "atTime": currentDate.getTime(),
            "newViewerNumber": newViewerNumber.length,
            "oldViewerNumber": oldViewerNumber.length
        };
        saveViewerDataMsg('/' + path, message);
    }
    // saveViewerDataMsg('/' + path, chatters.allChatters.length > oldMax ? chatters.allChatters.length : oldMax);
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
    //15分钟更新一次TwitchInsightBot
    twitchInsightBotIntervalId = setInterval(setTwitchInsightBotExpired, 15 * 60 * 1000);
    chatterPollIntervalId = setInterval(handleChatters, POLL_INTERVAL);
};

exports.stopChatterPoll = () => {
    clearPollInterval();
};