"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
// const frontendCommunicator = require("../common/frontend-communicator");
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


// function groupBy(list, keyGetter) {
//     const map = new Map();
//     list.forEach((item) => {
//         const key = keyGetter(item);
//         const collection = map.get(key);
//         if (!collection) {
//             map.set(key, [item]);
//         } else {
//             collection.push(item);
//         }
//     });
//     return map;
// }

// function queryTopChart(querymessage) {
//     return new Promise (resolve => {
//         db.find({$and: [{timestamp: {$gt: 1638359485000 } }, { timestamp: {$lt: 1648964285000 } }] }, function (err, docs) {
//             //找到本周相关用户
//             if (err) {
//                 return resolve([]);
//             }
//             return resolve(docs);
//         });
//     });
// }

// frontendCommunicator.onAsync("addEmoteMessageData", async(emoteData) => {
//     return addEmoteMessageData(emoteData) || [];
// });

exports.loadNewFollowDatabase = loadNewFollowDatabase;
exports.getNewFollowDb = getNewFollowDb;
exports.addNewFollow = addNewFollow;
