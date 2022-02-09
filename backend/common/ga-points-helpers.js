"use strict";
const gaManager = require("./ga-manager");
const viewtimeDb = require("../database/viewtimeDatabase");
const chatmessageDb = require("../database/chatMessageDatabase");
const newfollowDb = require("../database/newfollowDatabase");
const galivepointsDb = require("../database/gaLivePointsDatabase");
const profileManager = require("./profile-manager.js");

// 从kolTopChart文件中获取直播的时间数据
function getTopChartFile() {
    return profileManager.getJsonDbInProfile("/data/kolTopChart");
}
function getTopChartDataFromFile(path) {
    let data = null;
    try {
        data = getTopChartFile().getData(path);
    } catch (err) {} //eslint-disable-line no-empty
    return data;
}

//gaService发送StreamerLive信息
let queryTime = {};
let kolTotalViewTimes = 0;
let kolTotalChatMessages = 0;
let kolTotalFollowed = 0;
function calculatorPoints(queryDataResult, x = 1, bonus = 1) {
    //排除0不能作除数,且x非负
    if (x <= 0) {
        x = 1;
    }
    return Math.floor(queryDataResult / x) * bonus;
}
function streamerGiveAwayPointsInLive(queryTime) {
    if (queryTime.startTime === null || queryTime.endTime === null) {
        return;
    }
    let viewTimePromise = viewtimeDb.queryTopViewTimes(queryTime);
    let chatMessagePromise = chatmessageDb.queryTopChart(queryTime);
    let newFollowPromise = newfollowDb.queryNewFollower(queryTime);
    Promise.all([viewTimePromise, chatMessagePromise, newFollowPromise]).then(values => {
        //获取观看时长总和
        for (let i = 0; i < values[0].length; i++) {
            kolTotalViewTimes += values[0][i].viewTime;
        }
        //获取发言条数总和
        kolTotalChatMessages = values[1].length;
        //获取新关注条数信息总和
        kolTotalFollowed = values[2].length;

        /*主播名:发放积分总数:新关注积分:观看时长积分:聊天积分数
        发放积分总数 = 新关注积分 + 观看时长积分 + 聊天积分数
        新关注积分 = (kolTotalFollowed/1 * followerBonus) : 每一个关注加followerBonus积分
        观看时长积分( Math.floor(kolTotalViewTimes/a) * viewTimeBonus) : 每x分钟加viewTimeBonus积分
        聊天积分数(Math.floor(kolTotalChatMessages/b )* chatMessageBonus) : 每b条聊天记录加chatMessageBonus积分
        */
        let giveAwayFollowPoints = calculatorPoints(kolTotalFollowed, 1, 100);
        let giveAwayViewTimePoints = calculatorPoints(kolTotalViewTimes, 10, 5);
        let giveAwayChatMessagePoints = calculatorPoints(kolTotalChatMessages, 1, 1);
        let totalPoints = giveAwayFollowPoints + giveAwayViewTimePoints + giveAwayChatMessagePoints;
        let streamer = profileManager.getJsonDbInProfile('/auth-twitch').getData('/streamer', true);
        gaManager.sendEventAndReturnStatus(
            'user',
            `give_away_points`,
            streamer.username +
            ' : ' + totalPoints +
            ' : ' + giveAwayFollowPoints +
            ' : ' + giveAwayViewTimePoints +
            ' : ' + giveAwayChatMessagePoints
        );
        galivepointsDb.insertStreamerGiveAwayPoints(
            streamer.userId,
            streamer.username,
            streamer.avatar,
            queryTime.startTime,
            queryTime.endTime,
            totalPoints,
            giveAwayViewTimePoints,
            giveAwayChatMessagePoints,
            giveAwayFollowPoints);
    });
}
function gaSendStreamerGiveAwayPoints() {
    //只有用户开播过，才发送积分
    let checkStreamerHasLived = getTopChartDataFromFile("/");
    if (!checkStreamerHasLived.hasOwnProperty("isBroadCasted")) {
        //set isBroadCasted false;
        getTopChartFile().push("/isBroadCasted", false, true);
        //发送退出程序事件
        gaManager.appQuit.emit("app-quit");
    } else {
        if (checkStreamerHasLived.isBroadCasted) {
            let startTime = getTopChartDataFromFile("/latest/started_at");
            let endTime = getTopChartDataFromFile("/latest/ended_at");
            //检测状态，关闭Tbot时，是否已经正常关播，正常关播时，endTime > startTime
            if (startTime > endTime) {
                endTime = new Date().getTime();//关闭Tbot时，未结束直播
            }
            queryTime = {
                "startTime": startTime,
                "endTime": endTime
            };
            //向ga发送直播发送的积分数据
            streamerGiveAwayPointsInLive(queryTime);
            //set isBroadCasted false;
            getTopChartFile().push("/isBroadCasted", false, true);
        } else {
            //发送退出程序事件
            gaManager.appQuit.emit("app-quit");
        }
    }
}

exports.gaSendStreamerGiveAwayPoints = gaSendStreamerGiveAwayPoints;