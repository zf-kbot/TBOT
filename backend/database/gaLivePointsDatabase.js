"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");
const logger = require("../logwrapper");
// const moment = require("moment");

// const { resolve, reject } = require('bluebird');
// const { quote } = require('underscore.string');
/**
 * @type Datastore
 */
let db;

function loadGaLivePointsDatabase() {
    let path = profileManager.getPathInProfile("/db/galivepoints.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getGaLivePointsDb() {
    return db;
}

//直接插入用户积分，做记录备份
function insertStreamerGiveAwayPoints (userId, userName, profilePicUrl, createdAtStartTime, createdAtEndTime, giveAwayTotalPoints = 0, giveAwayTotalViewTimePoints = 0, giveAwayTotalChatMessagePoints = 0, giveAwayFollowPoints = 0) {
    db.insert({
        userId: userId,
        userName: userName,
        profilePicUrl: profilePicUrl,
        giveAwayTotalPoints: giveAwayTotalPoints,
        giveAwayTotalViewTimePoints: giveAwayTotalViewTimePoints,
        giveAwayTotalChatMessagePoints: giveAwayTotalChatMessagePoints,
        giveAwayFollowPoints: giveAwayFollowPoints,
        createdAtStartTime: createdAtStartTime,
        createdAtEndTime: createdAtEndTime
    }, function(err, doc) {});
}

frontendCommunicator.onAsync("insertStreamerGiveAwayPoints", async(streamerGiveAwayPointsData) => {
    return insertStreamerGiveAwayPoints(streamerGiveAwayPointsData.userId,
        streamerGiveAwayPointsData.userName,
        streamerGiveAwayPointsData.profilePicUrl,
        streamerGiveAwayPointsData.createdAtStartTime,
        streamerGiveAwayPointsData.createdAtEndTime,
        streamerGiveAwayPointsData.giveAwayTotalPoints,
        streamerGiveAwayPointsData.giveAwayTotalViewTimePoints,
        streamerGiveAwayPointsData.giveAwayTotalChatMessagePoints,
        streamerGiveAwayPointsData.giveAwayFollowPoints);
});

exports.loadGaLivePointsDatabase = loadGaLivePointsDatabase;
exports.getGaLivePointsDb = getGaLivePointsDb;
exports.insertStreamerGiveAwayPoints = insertStreamerGiveAwayPoints;
