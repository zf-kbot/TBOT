"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");
const logger = require("../logwrapper");
const moment = require("moment");

// const { resolve, reject } = require('bluebird');
// const { quote } = require('underscore.string');
/**
 * @type Datastore
 */
let db;

function loadUserPointsDatabase() {
    let path = profileManager.getPathInProfile("/db/userpoints.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getUserPointsDb() {
    return db;
}

function insertUserPoints (_id, userName, profilePicUrl, totalViewTimePoints = 0, totalChatMessagePoints = 0, followPoints = 0) {
    db.insert({
        _id: _id, userName: userName,
        profilePicUrl: profilePicUrl,
        totalViewTimePoints: totalViewTimePoints,
        totalChatMessagePoints: totalChatMessagePoints,
        followPoints: followPoints
    }, function(err, doc) {});
}

//更新单个用户在线时长积分,与关注积分, 计算方法f(x,y)= floor(viewTime/x) * viewTimebonus;每x分钟加viewTimebonus积分；
function updateUserViewTimeAndFollowPoints(user, x = 10, viewTimeBonus = 5, followBonus = 100) {
    if (user.isFollowed) { //用户是关注状态就设置followPoints为followBonus
        //正式查询插入
        db.find({_id: user._id}, function(err, doc) {
            if (!err) {
                //如果找到了，就更新数据信息
                if (doc.length) {
                    db.update({_id: doc[0]._id}, {$set: {totalViewTimePoints: Math.floor(user.minutesInChannel / x) * viewTimeBonus, followPoints: followBonus}}, {}, function() {});
                } else { //没有找到就插入:用户id,用户名称，用户头像，totalViewTimePoints, totalChatMessagePoints, followPoints
                    insertUserPoints(user._id, user.username, user.profilePicUrl, 0, 0, followBonus);
                }
            }
        });
    } else { //用户未关注，followPoints为0
        db.find({_id: user._id}, function(err, doc) {
            if (!err) {
                if (doc.length) {
                    db.update({_id: doc[0]._id}, {$set: {totalViewTimePoints: Math.floor(user.minutesInChannel / x) * viewTimeBonus, followPoints: 0}}, {}, function() {});
                } else { //没有找到就插入:用户id,用户名称，用户头像，totalViewTimePoints, totalChatMessagePoints, followPoints
                    insertUserPoints(user._id, user.username, user.profilePicUrl, 0, 0, followBonus);
                }
            }
        });
    }
}

//更新单个用户聊天积分,计算方法f(x,y)= floor(chatMessage/x) * y;每x条聊天记录加y积分；
function updateUserChatMessagePoints(user, x = 1, y = 1) {
    db.find({_id: user._id}, function(err, doc) {
        if (!err) {
            if (doc.length) {
                db.update({_id: doc[0]._id}, {$set: {totalChatMessagePoints: Math.floor(user.chatMessages / x) * y}}, {}, function() {});
            } else {
                insertUserPoints(user._id, user.username, user.profilePicUrl, 0, 0, 0);
            }
        }
    });
}


exports.loadUserPointsDatabase = loadUserPointsDatabase;
exports.getUserPointsDb = getUserPointsDb;
exports.updateUserViewTimeAndFollowPoints = updateUserViewTimeAndFollowPoints;
exports.updateUserChatMessagePoints = updateUserChatMessagePoints;