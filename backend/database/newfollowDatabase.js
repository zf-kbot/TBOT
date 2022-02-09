"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");
const logger = require("../logwrapper");

/**
 * @type Datastore
 */
let db;

function loadNewFollowDatabase() {
    let path = profileManager.getPathInProfile("/db/newfollow.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getNewFollowDb() {
    return db;
}

function addNewFollow(followMsg) {
    return new Promise(async resolve => {
        //Insert follow message into db
        db.insert(followMsg, err => {
            if (err) {
                logger.error("ViewDB: Error adding follower user Message", err);
                resolve(null);
            } else {
                resolve(followMsg);
            }
        });
    });
}


function queryNewFollower(queryTime) {
    return new Promise (resolve => {
        db.find({$and: [{followedDate: {$gt: queryTime.startTime } }, { followedDate: {$lt: queryTime.endTime } }] }, function (err, docs) {
            //找到queryTime时间段内的记录
            if (err) {
                return resolve([]);
            }
            return resolve(docs);
        });
    });
}

frontendCommunicator.onAsync("getNewFollower", async(queryTime) => {
    let queryResult = await queryNewFollower(queryTime) || [];
    return queryResult || [];
});


exports.loadNewFollowDatabase = loadNewFollowDatabase;
exports.getNewFollowDb = getNewFollowDb;
exports.addNewFollow = addNewFollow;
exports.queryNewFollower = queryNewFollower;
