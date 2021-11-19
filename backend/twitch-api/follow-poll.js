"use strict";

const accountAccess = require("../common/account-access");

const profileManager = require("../common/profile-manager");

const twitchApi = require("./client");

const twitchEventsHandler = require("../events/twitch-events");
const logger = require("../logwrapper");

let followPollIntervalId;
let lastUserId;
let pollStartTime;
let kolUserNameList = "";
let kolCanSend = true;


//use userId to send user name List;
function kolSendFollowMsg(userId) {
    //only when  kolCanSend is true and kolUserNameList not null, it will autoreply thanks message! 
    if (kolCanSend && kolUserNameList !== "") {
        let dataMsg = profileManager.getJsonDbInProfile("/interactive-tool/chat-notifications").getData("/followers");
        let kolNamecount = 5;
        let kolNameList = kolUserNameList.split(" ");
        if (kolNameList.length > kolNamecount) {
            kolUserNameList = "";
            for (let i = 0; i < kolNamecount; i++) {
                if (i === kolNamecount - 1) {
                    kolUserNameList = kolUserNameList + kolNameList[i] + ",";
                } else {
                    kolUserNameList = kolUserNameList + kolNameList[i] + ", ";
                }
            }
            kolUserNameList = kolUserNameList + "etc.";
        }
        twitchEventsHandler.follow.triggerFollow(kolUserNameList, userId);
        kolUserNameList = "";
        kolCanSend = false;
        setTimeout(() => {
            kolCanSend = true;
            kolSendFollowMsg(userId);
        }, dataMsg.cooldownTime * 1000);
    }
}


function getTotalFollowDataFile() {
    return profileManager.getJsonDbInProfile('/totalfollowdata');
}

function pushTotalFollowDataToFile(path, data) {
    try {
        getTotalFollowDataFile().push(path, data, true);
    } catch (err) { } //eslint-disable-line no-empty
}

// 保存到本地
function saveTotalFollowDataMsg(path, msg) {
    pushTotalFollowDataToFile(path, msg);
}

// 保存到本地
function getTotalFollowDataMsgs(path) {
    try {
        let data = getTotalFollowDataFile().getData(path);
        return data ? data : [];
    } catch (err) {
        return 0;
    }
}

// function pushViewerDataMsg(message) {
//     let currentDate = new Date();
//     let path = `${currentDate.getDate()} ${currentDate.getMonth()}, ${currentDate.getFullYear()}`
//     saveTotalFollowDataMsg('/' + path, msg);
// };

function loadTotalFollowDataMsgs() {
    historyQueue = getTotalFollowDataMsgs('/msgs');
};


//每日新增关注
function getNewFollowDataFile() {
    return profileManager.getJsonDbInProfile('/newfollowdata');
}

function pushNewFollowDataToFile(path, data) {
    try {
        getNewFollowDataFile().push(path, data, true);
    } catch (err) { } //eslint-disable-line no-empty
}

// 保存到本地
function saveNewFollowDataMsg(path, msg) {
    pushNewFollowDataToFile(path, msg);
}

// 保存到本地
function getNewFollowDataMsgs(path) {
    try {
        let data = getNewFollowDataFile().getData(path);
        return data ? data : [];
    } catch (err) {
        return 0;
    }
}

// function pushViewerDataMsg(message) {
//     let currentDate = new Date();
//     let path = `${currentDate.getDate()} ${currentDate.getMonth()}, ${currentDate.getFullYear()}`
//     saveNewFollowDataMsg('/' + path, msg);
// };




//每日新增取关
function getNewUnfollowDataFile() {
    return profileManager.getJsonDbInProfile('/newunfollowdata');
}

function pushNewUnfollowDataToFile(path, data) {
    try {
        getNewUnfollowDataFile().push(path, data, true);
    } catch (err) { } //eslint-disable-line no-empty
}

// 保存到本地
function saveNewUnfollowDataMsg(path, msg) {
    pushNewUnfollowDataToFile(path, msg);
}

// 保存到本地
function getNewUnfollowDataMsgs(path) {
    try {
        let data = getNewUnfollowDataFile().getData(path);
        return data ? data : [];
    } catch (err) {
        return 0;
    }
}

// function pushViewerDataMsg(message) {
//     let currentDate = new Date();
//     let path = `${currentDate.getDate()} ${currentDate.getMonth()}, ${currentDate.getFullYear()}`
//     saveNewUnfollowDataMsg('/' + path, msg);
// };


function clearPollInterval() {
    if (followPollIntervalId != null) {
        clearTimeout(followPollIntervalId);
    }
}

exports.startFollowPoll = () => {
    clearPollInterval();
    pollStartTime = Date.now();
    followPollIntervalId = setInterval(async () => {
        const streamer = accountAccess.getAccounts().streamer;
        const client = twitchApi.getClient();
        logger.debug("There are ??? follow user");
        if (client == null || !streamer.loggedIn) return;

        const followRequest = client.helix.users.getFollowsPaginated({
            followedUser: streamer.userId
        });

        const follows = await followRequest.getNext();
        // let currentDate = new Date();
        let newUnfollow = 0;
        let path = `${new Date().getFullYear()} ${new Date().getMonth()+1} ${new Date().getDate()}`;
        let oldMax = getTotalFollowDataMsgs('/'+path);
        //获取当前取关变化数量
        newUnfollow = follows.length - oldMax;
        saveTotalFollowDataMsg('/'+path, follows.length);
        if (follows == null || follows.length < 1) return;

        if (lastUserId == null) {
            lastUserId = follows[0].userId;
        } else {
            for (const follow of follows) {

                if (follow.followDate < pollStartTime) {
                    break;
                }

                if (follow.userId !== lastUserId) {
                    // let currentDate = new Date();
                    const followsAll = await followRequest.getAll();
                    let path = `${new Date().getFullYear()} ${new Date().getMonth()+1} ${new Date().getDate()}`;
                    let oldMax = getNewFollowDataMsgs('/'+path);
                    logger.debug(`There are ${follow.userDisplayName}---${follow.userId}`);
                    saveNewFollowDataMsg('/'+path, oldMax+1);
                    kolUserNameList = kolUserNameList + follow.userDisplayName + " ";
                    if (kolCanSend) {
                        kolSendFollowMsg(follow.userId);
                    }
                } else {
                    break;
                }

            }
            lastUserId = follows[0].userId;
            pollStartTime = Date.now();            
        }
        let newfollow= getNewFollowDataMsgs('/'+path);
        saveNewUnfollowDataMsg('/'+path, newfollow - newUnfollow);
    }, 10000);
};

exports.stopFollowPoll = () => {
    clearPollInterval();
};