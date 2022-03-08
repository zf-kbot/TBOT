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
//如果没有就返回数值，不是返回数组
function getDataMsgs(filePath, path) {
    try {
        let data = getDataFile(filePath).getData(path);
        return data ? data : 0;
    } catch (err) {
        return 0;
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
        if (client == null || !streamer.loggedIn) return;

        const followRequest = client.helix.users.getFollowsPaginated({
            followedUser: streamer.userId
        });

        const follows = await followRequest.getNext();
        const totalFollowers = await followRequest.getTotalCount();
        let path = `${new Date().getFullYear()} ${new Date().getMonth() + 1} ${new Date().getDate()}`;
        saveDataMsgs('/data/achievement/follower', '/' + path, totalFollowers);
        if (follows == null || follows.length < 1) return;

        if (lastUserId == null) {
            //程序刚启动，将follow的数据全部写入一次
            const userDatabase = require("../database/userDatabase");
            for (const follow of follows) {
                userDatabase.setChatUserFollowed(follow.userId);
            }
            lastUserId = follows[0].userId;
        } else {
            for (const follow of follows) {

                if (follow.followDate < pollStartTime) {
                    break;
                }

                if (follow.userId !== lastUserId) {
                    //有用户关注，更新用户关注经验或初始化
                    let user = {
                        _id: follow.userId,
                        username: follow.userName,
                        minutesInChannel: 0, //在followXP中触发初始化时使用
                        chatMessages: 0, //在followXP中触发初始化时使用
                        isFollowed: true //这是在检测到有关注，肯定为true
                    };
                    const userxpdb = require("../database/userXPDatabase");
                    let jsonDataHelpers = require("../common/json-data-helpers");
                    let followBonus = 100;//followBonus的默认值
                    let bonusSetting = jsonDataHelpers.getNumberDataMsgs('/loyalty-community/loyalsetting', '/bonusSetting');
                    if (bonusSetting.hasOwnProperty("followBonus")) {
                        followBonus = bonusSetting.followBonus;
                    }
                    userxpdb.updateUserFollowXP(user, false, followBonus);
                    //有可能有用户关注后取消，然后再关注，不使用用户id为_id进行存储
                    let followMsg = {
                        followedDate: follow._data.followed_at,
                        from_id: follow._data.from_id,
                        from_name: follow._data.from_name,
                        to_id: follow._data.to_id,
                        to_name: follow._data.to_name,
                        createdAt: new Date(follow._data.followed_at).getTime()
                    };
                    //插入数据
                    const newFollowDatabase = require("../database/newfollowDatabase");
                    newFollowDatabase.addNewFollow(followMsg);
                    const userDatabase = require("../database/userDatabase");
                    userDatabase.setChatUserFollowed(follow.userId);
                    let path = `${new Date().getFullYear()} ${new Date().getMonth() + 1} ${new Date().getDate()}`;
                    //getDataMsgs如果不存在返回的是0
                    let oldMax = getDataMsgs('/data/achievement/newfollower', '/' + path);
                    saveDataMsgs('/data/achievement/newfollower', '/' + path, oldMax + 1);
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
    }, 10000);
};

exports.stopFollowPoll = () => {
    clearPollInterval();
};