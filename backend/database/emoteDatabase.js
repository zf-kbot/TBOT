"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");
const logger = require("../logwrapper");
const { resolve, reject } = require('bluebird');
// const { quote } = require('underscore.string');
/**
 * @type Datastore
 */
let db;

function loadEmoteDatabase() {
    let path = profileManager.getPathInProfile("/db/emote.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getEmoteDb() {
    return db;
}

function addEmoteMessageData(emoteData) {
    return new Promise(async resolve => {
        //Insert emoteMessage into db
        for (let i = 0; i < emoteData.emoteItem.length; i++) {
            let emoteMessage = {
                userId: emoteData.userId,
                userName: emoteData.userName,
                emoteItem: emoteData.emoteItem[i],
                createdAt: emoteData.createdAt
            };
            db.insert(emoteMessage, err => {
                if (err) {
                    logger.error("ViewDB: Error adding emoteMessage", err);
                    resolve(null);
                } else {
                    resolve(emoteMessage);
                }
            });
        }
    });
}


function groupBy(list, keyGetter) {
    const map = new Map();
    list.forEach((item) => {
        const key = keyGetter(item);
        const collection = map.get(key);
        if (!collection) {
            map.set(key, [item]);
        } else {
            collection.push(item);
        }
    });
    return map;
}

function queryTopEmote(queryTime) {
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

frontendCommunicator.onAsync("addEmoteMessageData", async(emoteData) => {
    return addEmoteMessageData(emoteData) || [];
});

frontendCommunicator.onAsync("getTopEmotes", async(queryTime) => {
    let queryResult = await queryTopEmote(queryTime) || [];
    // let group = groupBy(queryResult, doc => doc.username);
    return queryResult || [];
});
exports.loadEmoteDatabase = loadEmoteDatabase;
exports.getEmoteDb = getEmoteDb;
exports.addEmoteMessageData = addEmoteMessageData;
