"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");
const logger = require("../logwrapper");

/**
 * @type Datastore
 */
let db;

function loadPunishmentHistoryDatabase() {
    let path = profileManager.getPathInProfile("/db/punishmenthistory.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getPunishmentHistoryDb() {
    return db;
}

//写入惩罚数据
function createPunishmentHistory(messageItem) {
    return new Promise(async resolve => {
        //直接全部写入进去，或者考虑结合chatMessage.db来做(由于是一个一个的取，需要不停查询，)
        let punishmentHistory = {
            _id: messageItem._id,
            phrase: messageItem.phrase,
            punishment: messageItem.punishment,
            message: messageItem.message,
            userId: messageItem.userId,
            username: messageItem.username,
            profilePicUrl: messageItem.profilePicUrl,
            createdAt: messageItem.createdAt
        };
        //Insert chatMessage into db
        db.insert(punishmentHistory, err => {
            if (err) {
                logger.error("ViewDB: Error adding chatMessage", err);
                resolve(null);
            } else {
                resolve(punishmentHistory);
            }
        });
    });
}

//获取所有数据
function getPunishmentHistoryLogs() {
    return new Promise(async resolve => {
        db.find({}, function (err, users) {
            resolve(Object.values(users));
        });
    });
}


frontendCommunicator.onAsync("getPunishmentHistoryLogs", async() => {
    return getPunishmentHistoryLogs().catch(() => {}) || [];
});


exports.getPunishmentHistoryDb = getPunishmentHistoryDb;
exports.loadPunishmentHistoryDatabase = loadPunishmentHistoryDatabase;
exports.createPunishmentHistory = createPunishmentHistory;