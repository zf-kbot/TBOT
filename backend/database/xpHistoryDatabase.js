"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const logger = require("../logwrapper");

/**
 * @type Datastore
 */
let db;

function loadXPHistoryDatabase() {
    let path = profileManager.getPathInProfile("/db/xphistory.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getXPHistoryDb() {
    return db;
}

//插入用户经验值日志信息
function insertXPHistory(historyInfo, addedReason) {
    db.insert({
        userId: historyInfo.userId, //用户id
        currentXP: historyInfo.currentXP, //当前的经验值
        type: historyInfo.type, //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
        reason: addedReason, //增加的原因
        xpAdded: historyInfo.xpAdded, //增加的经验值
        totaclXP: historyInfo.totaclXP, //增加后的经验值
        createdAt: new Date().getTime()//时间戳，毫秒
    }, function(err, doc) {});
}

exports.loadXPHistoryDatabase = loadXPHistoryDatabase;
exports.getXPHistoryDb = getXPHistoryDb;
exports.insertXPHistory = insertXPHistory;