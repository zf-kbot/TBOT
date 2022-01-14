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

function loadChatMessageDatabase() {
    let path = profileManager.getPathInProfile("/db/chatmessage.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getChatMessageDb() {
    return db;
}

function getNextChatMessageId() {
    return new Promise(resolve => {
        db.update(
            {_id: '__autoid__'},
            {$inc: {seq: 1}},
            {upsert: true, returnUpdatedDocs: true},
            function (err, _, autoid) {
                if (err) {
                    resolve(null);
                }
                resolve(autoid.seq);
            }
        );
    });
}
/**
function addChatMessage(message) {
    return new Promise(async (resolve, reject) => {
        let newChatMessageId = await getNextChatMessageId();
        if (newChatMessageId == null) {
            logger.error("Unable to add chatMessage as we could not generate a new ID");
            return reject();
        }
        message.chatMessageId = newChatMessageId;
        db.insert(quote, err => {
            if (err) {
                logger.error("QuoteDB: Error adding quote: ", err.message);
                return reject();
            }
            resolve(newChatMessageId);
        });
    });
}
 */

function createChatMessage(messageItem) {
    return new Promise(async resolve => {
        let chatMessage = {
            _id: messageItem.data.id,
            userId: messageItem.data.userId,
            username: messageItem.data.username,
            data: messageItem,
            createdAt: new Date(messageItem.data.timestamp._d).getTime()
        };
        //Insert chatMessage into db
        db.insert(chatMessage, err => {
            if (err) {
                logger.error("ViewDB: Error adding chatMessage", err);
                resolve(null);
            } else {
                resolve(chatMessage);
            }
        });
    });
}

function updateChatMessage(chatMessage) {
    return new Promise(resolve => {
        if (chatMessage == null) {
            return resolve(false);
        }
        db.update({userId: "000002"}, { $set: { userId: "000001" } }, {}, function (err) {
            if (err) {
                logger.warn("Failed to update chatMessage in DB", err);
            }
            resolve();
        });
    });
}

function getChatMessageByUserId(userId) {
    return new Promise (resolve => {
        db.find({userId: userId}, (err, docs) => {
            if (err) {
                return resolve([]);
            }
            return resolve(docs);
        });
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

function queryTopChart(queryTime) {
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
frontendCommunicator.onAsync("getTopChatters", async(queryTime) => {
    let queryResult = await queryTopChart(queryTime) || [];
    // let group = groupBy(queryResult, doc => doc.username);
    return queryResult || [];
});
frontendCommunicator.onAsync("addChatMessage", messageItem => {
    // addChatMessage(message).catch(() => {});
    createChatMessage(messageItem).catch(() => {});
});

frontendCommunicator.onAsync("testquery", async(querymessage) => {
    let queryResult = await queryTopChart(querymessage) || [];
    // let group = groupBy(queryResult, doc => doc.username);
    return queryResult || [];
});

frontendCommunicator.onAsync("selectMessagesByUsername", async(userId) => {
    let selectMessages = await getChatMessageByUserId(userId);
    return selectMessages || [];
});

frontendCommunicator.onAsync("updateChatMessage", async(updateChatMessageyes) => {
    updateChatMessage(updateChatMessageyes);
});

exports.getChatMessageDb = getChatMessageDb;
exports.loadChatMessageDatabase = loadChatMessageDatabase;
// exports.addChatMessage = addChatMessage;
exports.createChatMessage = createChatMessage;
exports.updateChatMessage = updateChatMessage;
exports.getChatMessageByUserId = getChatMessageByUserId;