"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");
const logger = require("../logwrapper");
// const { resolve, reject } = require('bluebird');
// const { quote } = require('underscore.string');
/**
 * @type Datastore
 */
let db;

function loadViewTimeDatabase() {
    let path = profileManager.getPathInProfile("/db/viewtime.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getViewTimeDb() {
    return db;
}

function queryTopViewTimes(queryTime) {
    return new Promise (resolve => {
        db.find({$and: [{createdAt: {$gt: queryTime.startTime } }, { createdAt: {$lt: queryTime.endTime } }] }, function (err, docs) {
            //找到本周相关用户
            if (err) {
                return resolve([]);
            }
            return resolve(docs);
        });
    });
}

// frontendCommunicator.onAsync("addEmoteMessageData", async(emoteData) => {
//     return addEmoteMessageData(emoteData) || [];
// });
frontendCommunicator.onAsync("getTopViewTimes", async(queryTime) => {
    let queryResult = await queryTopViewTimes(queryTime) || [];
    // let group = groupBy(queryResult, doc => doc.username);
    return queryResult || [];
});
exports.loadViewTimeDatabase = loadViewTimeDatabase;
exports.getViewTimeDb = getViewTimeDb;
// exports.addViewTimeData = addViewTimeData;
