"use strict";
const Datastore = require("nedb");
const profileManager = require("../common/profile-manager");
const logger = require("../logwrapper");
const moment = require("moment");
const { ipcMain } = require("electron");
const { settings } = require("../common/settings-access.js");
const currencyDatabase = require("./currencyDatabase");
const twitchChat = require("../chat/twitch-chat");
const frontendCommunicator = require("../common/frontend-communicator");
const userAccess = require("../common/user-access");
const eventManager = require("../events/EventManager");
const accountAccess = require("../common/account-access");
const util = require("../utility");

const jsonDataHelpers = require("../common/json-data-helpers");
const viewtimeDb = require("../database/viewtimeDatabase");
const userpointsDb = require("../database/userPointsDatabase");
const { resolve } = require("bluebird");

/**
 * @typedef TwitchbotUser
 * @property {string} _id
 * @property {string} username
 * @property {string} displayName
 * @property {string} profilePicUrl
 * @property {boolean} twitch
 * @property {string[]} twitchRoles
 * @property {boolean} online
 * @property {number} onlineAt
 * @property {number} lastSeen
 * @property {number} joinDate
 * @property {number} minutesInChannel
 * @property {number} chatMessages
 * @property {boolean} disableAutoStatAccrual
 * @property {boolean} disableActiveUserList
 * @property {Object.<string, *>=} metadata
 * @property {Object.<string, number>} currency
 */

/**
 * @type Datastore<TwitchbotUser>
 */
let db;
let updateTimeIntervalId;
let updateLastSeenIntervalId;
let updateUserXPIntervalId;
let dbCompactionInterval = 30000;
let viewtimedb;
function updateUserViewTime(user) {
    //正式查询插入
    let stamp1 = new Date().setHours(0, 0, 0, 0);
    let stamp2 = moment(stamp1).add(1, "d") - 1;
    viewtimedb.find({$and: [{userId: user._id}, {createdAt: {$gt: stamp1}}, {createdAt: {$lt: stamp2}}]}, function(err, doc) {
        if (!err) {
            if (doc.length) {
                viewtimedb.update({_id: doc[0]._id}, {$set: {viewTime: doc[0].viewTime + 1}}, {}, function() {});
            } else {
                viewtimedb.insert({userId: user._id, userName: user.username, profilePicUrl: user.profilePicUrl, viewTime: 1, createdAt: user.lastSeen }, function (err, doc) {
                });
            }
        }
    });
}
function insertOrUpdateAllUserViewTime() {
    const connectionManager = require("../common/connection-manager");
    if (connectionManager.streamerIsOnline()) {
        db.find({ online: true }, (err, docs) => {
            if (!err) {
                viewtimedb = viewtimeDb.getViewTimeDb();
                docs.forEach((user) => {
                    updateUserViewTime(user);
                });
            }
        });
    }
}
//更新在线用户的在线时长积分 和 关注积分
function insertOrUpdateAllUserViewTimeAndFollowPoints() {
    const connectionManager = require("../common/connection-manager");
    if (connectionManager.streamerIsOnline()) {
        db.find({ online: true }, (err, docs) => {
            if (!err) {
                docs.forEach((user) => {
                    userpointsDb.updateUserViewTimeAndFollowPoints(user);
                });
            }
        });
    }
}

//更新用户聊天消息积分
function insertOrUpdateChatMessagePoints(userId) {
    db.find({ _id: userId }, (err, docs) => {
        if (!err) {
            docs.forEach((user) => {
                userpointsDb.updateUserChatMessagePoints(user);
            });
        }
    });
}


function getUserDb() {
    return db;
}

// Checks the settings to see if viewer DB is set to on.
function isViewerDBOn() {
    return settings.getViewerDbStatus();
}

//update users with last seen time
//allows us to recover chat hours from crash
function setLastSeenDateTime() {
    if (!isViewerDBOn()) {
        return;
    }

    db.update({ online: true }, { $set: { lastSeen: Date.now() } }, { multi: true }, (err, num) => {
        if (err) {
            logger.debug("ViewerDB: Error setting last seen");
        } else {
            logger.debug(`ViewerDB: Setting last seen date for ${num} users`);
        }
    });
    insertOrUpdateAllUserViewTime();
    //更新用户观看时长积分 与 关注积分（区别于加经验值）//暂时注释掉，不处理加积分提升性能
    // insertOrUpdateAllUserViewTimeAndFollowPoints();
}

/**
 *
 * @param {string} username
 * @returns {Promise<TwitchbotUser>}
 */
function getUserByUsername(username) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve(false);
        }

        let searchTerm = new RegExp(`^${username}$`, 'i');

        db.findOne({ username: { $regex: searchTerm }, twitch: true }, (err, doc) => {
            if (err) {
                return resolve(false);
            }
            return resolve(doc);
        });
    });
}

/**
 *
 * @param {string} username
 * @returns {Promise<TwitchbotUser>}
 */
function getTwitchUserByUsername(username) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve(null);
        }

        let searchTerm = new RegExp(`^${username}$`, 'i');

        db.findOne({ username: { $regex: searchTerm }, twitch: true }, (err, doc) => {
            if (err) {
                return resolve(null);
            }
            return resolve(doc);
        });
    });
}

/**
 *
 * @param {TwitchbotUser} user
 * @returns {Promise<boolean>}
 */
function updateUser(user) {
    return new Promise(resolve => {
        if (user == null) {
            return resolve(false);
        }
        db.update({ _id: user._id }, user, {}, function (err) {
            if (err) {
                logger.warn("Failed to update user in DB", err);
                return resolve(false);
            }
            resolve(true);
        });
    });
}

async function updateUserMetadata(username, key, value, propertyPath) {

    if (username == null || username.length < 1 || key == null || key.length < 1) return;

    const user = await getTwitchUserByUsername(username);
    if (user == null) return;

    const metadata = user.metadata || {};

    try {
        const dataToSet = jsonDataHelpers.parseData(value, metadata[key], propertyPath);
        metadata[key] = dataToSet;

        user.metadata = metadata;

        await updateUser(user);
    } catch (error) {
        logger.error("Unable to set metadata for user");
    }
}

async function getUserMetadata(username, key, propertyPath) {
    if (username == null || username.length < 1 || key == null || key.length < 1) return null;

    const user = await getTwitchUserByUsername(username);

    if (user == null) return null;

    const metadata = user.metadata || {};

    return jsonDataHelpers.readData(metadata[key], propertyPath);
}

//look up user object by mixer name
function getMixerUserByUsername(username) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve(null);
        }

        let searchTerm = new RegExp(username, 'gi');

        db.findOne({ username: { $regex: searchTerm }, twitch: { $exists: false } }, (err, doc) => {
            if (err) {
                return resolve(null);
            }
            return resolve(doc);
        });
    });
}

/**
 *
 * @param {string} id
 * @returns {Promise<TwitchbotUser>}
 */
function getUserById(id) {
    return new Promise((resolve) => {
        if (!isViewerDBOn()) {
            return resolve(null);
        }

        db.findOne({ _id: id }, (err, doc) => {
            if (err) {
                logger.error(err);
                resolve(null);
            }
            resolve(doc);
        });
    });
}

//function to escape regex characters for search
function escape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"); // eslint-disable-line no-useless-escape
}

//returns array of users based on fragment of username
function searchUsers(usernameFragment) {
    return new Promise((resolve, reject) => {
        if (!isViewerDBOn()) {
            return resolve();
        }
        db.find({ username: new RegExp("/" + escape(usernameFragment) + "/") }, (docs, err) => {
            if (err) {
                reject(err.message);
            }
            resolve(docs);
        });
    });
}

function getAllUsernames() {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve([]);
        }

        const projectionObj = {
            displayName: 1
        };

        db.find({ twitch: true }).projection(projectionObj).exec(function (err, docs) {
            if (err) {
                logger.error("Error getting all users: ", err);
                return resolve([]);
            }
            return resolve(docs != null ? docs.map(u => u.displayName) : []);
        });
    });
}

function getTopViewTimeUsers(count) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve([]);
        }

        const sortObj = {
            minutesInChannel: -1
        };

        const projectionObj = {
            username: 1,
            minutesInChannel: 1
        };

        db.find({}).sort(sortObj).limit(count).projection(projectionObj).exec(function (err, docs) {
            if (err) {
                logger.error("Error getting top view time users: ", err);
                return resolve([]);
            }
            return resolve(docs || []);
        });
    });
}

//calculate the amount of time a user has spent in chat
function getUserOnlineMinutes(username) {
    return new Promise((resolve, reject) => {
        if (!isViewerDBOn()) {
            return resolve();
        }
        getUserByUsername(username).then(user => {
            resolve(
                user.online ? user.minutesInChannel + (Date.now() - user.onlineAt) / 60000 : user.minutesInChannel
            );
        },
        err => {
            reject(err);
        });
    });
}

/**
 * Triggers a View Time Update event and updates MixPlay participant if view time hours has increased
 */
function userViewTimeUpdate(user, previousTotalMinutes, newTotalMinutes) {
    if (user == null) return;
    let previousHours = previousTotalMinutes > 0 ? parseInt(previousTotalMinutes / 60) : 0;
    let newHours = newTotalMinutes > 0 ? parseInt(newTotalMinutes / 60) : 0;
    if (newHours < 1) return;
    if (newHours !== previousHours) {

        eventManager.triggerEvent("twitcherbot", "view-time-update", {
            username: user.username,
            previousViewTime: previousHours,
            newViewTime: newHours
        });
    }
}

function calcUserOnlineMinutes(user) {
    if (!isViewerDBOn() || !user.online || user.disableAutoStatAccrual) {
        return Promise.resolve();
    }

    const now = Date.now();

    // user.lastSeen is updated every minute by "setLastSeenDateTime".
    // If user.lastSeen was over a minute ago, we use user.lastSeen, otherwise we just use the current time.
    const lastSeen = (user.lastSeen && (now - user.lastSeen) > 60000) ? user.lastSeen : now;

    // Calculate the minutes to add to the user's total
    // Since this method is on a 15 min interval, we don't want to add anymore than 15 new minutes.
    const additionalMinutes = Math.min(Math.round((lastSeen - user.onlineAt) / 60000), 1);//因为修改了1分钟的轮询

    // No new minutes to add; return early to avoid hit to DB
    if (additionalMinutes < 1) {
        return Promise.resolve();
    }

    // Calculate users new minutes total.
    const previousTotalMinutes = user.minutesInChannel;
    const newTotalMinutes = previousTotalMinutes + additionalMinutes;

    return new Promise(resolve => {
        db.update({ _id: user._id }, { $set: { minutesInChannel: newTotalMinutes } }, {}, (err, numReplaced) => {
            if (err) {
                logger.debug('ViewerDB: Couldnt update users online minutes because of an error. UserId: ' + user._id);
                logger.debug(err);
            } else if (numReplaced === 0) {
                logger.debug('ViewerDB: Couldnt update users online minutes. UserId: ' + user._id);
            } else {
                userViewTimeUpdate(user, previousTotalMinutes, newTotalMinutes);
            }
            resolve();
        });
    });
}

// Recalculates online time for all users who are online.
function calcAllUsersOnlineMinutes() {
    const connectionManager = require("../common/connection-manager");
    if (connectionManager.streamerIsOnline()) {
        db.find({ online: true }, (err, docs) => {
            if (!err) {
                docs.forEach(user => calcUserOnlineMinutes(user));
            }
        });
    }
}
//viewTime 和chatMessage XP的轮询
function calcAllUsersXPPool() {
    //处理viewTimeXP,因为每
    const connectionManager = require("../common/connection-manager");
    if (connectionManager.streamerIsOnline()) {
        db.find({ online: true }, (err, docs) => {
            if (!err) {
                let userxpdb = require("./userXPDatabase");
                docs.forEach(user => {
                    //读取loyalsetting.json文件中数据
                    const jsonDataHelpers = require("../common/json-data-helpers");
                    let viewTimeBonus = 5;
                    let chatBonus = 1;
                    let bonusSetting = jsonDataHelpers.getObjectDataMsgs('/loyalty-community/loyalsetting', '/bonusSetting');
                    if (bonusSetting.hasOwnProperty('viewTimeBonus') && bonusSetting.hasOwnProperty('chatBonus')) {
                        viewTimeBonus = bonusSetting.viewTimeBonus;
                        chatBonus = bonusSetting.chatBonus;
                    }
                    //观看时长与聊天数量 的定时轮询任务加经验值
                    userxpdb.updateUserViewTimeAndChatMessageXP(user, false, viewTimeBonus, chatBonus);
                });
            }
        });
    }
}

function calOldViewer() {
    return new Promise (resolve => {
        db.find({$and: [{online: true }, {isNewViewer: false}]}, (err, docs) => {
            if (!err) {
                return resolve(docs);
            }
        });
    });
}

function calNewViewer() {
    return new Promise (resolve => {
        db.find({$and: [{online: true }, {isNewViewer: true}]}, (err, docs) => {
            if (!err) {
                return resolve(docs);
            }
        });
    });
}

function removeUser(userId) {
    return new Promise(resolve => {
        if (userId == null) {
            return resolve(false);
        }
        db.remove({ _id: userId }, {}, function (err) {
            if (err) {
                logger.warn("Failed to remove user from DB", err);
                return resolve(false);
            }
            resolve(true);
        });
    });
}

/**
 * @returns {Promise<TwitchbotUser>}
 */
function createNewUser(userId, username, displayName, profilePicUrl, twitchRoles, isOnline = false) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve(null);
        }

        let streamerUserId = accountAccess.getAccounts().streamer.userId;
        let botUserId = accountAccess.getAccounts().bot.userId;

        let disableAutoStatAccrual = userId === streamerUserId || userId === botUserId;

        /**@type {TwitchbotUser} */
        let user = {
            username: username,
            _id: userId,
            displayName: displayName,
            profilePicUrl: profilePicUrl,
            twitch: true,
            twitchRoles: twitchRoles || [],
            online: isOnline,
            onlineAt: Date.now(),
            lastSeen: Date.now(),
            joinDate: Date.now(),
            minutesInChannel: 0,
            chatMessages: 0,
            disableAutoStatAccrual: disableAutoStatAccrual,
            disableActiveUserList: false,
            metadata: {},
            currency: {},
            isNewViewer: true,
            isBot: false,
            isFollowed: false
        };

        // THIS IS WHERE YOU ADD IN ANY DYNAMIC FIELDS THAT ALL USERS SHOULD HAVE.
        // Add in all of our currencies and set them to 0.
        user = currencyDatabase.addCurrencyToNewUser(user);

        // Insert our record into db.
        db.insert(user, err => {
            if (err) {
                logger.error("ViewerDB: Error adding user", err);
                resolve(null);
            } else {
                resolve(user);
            }
        });
    });
}

/**
 * @returns {Promise<TwitchbotUser[]>}
 */
function getOnlineUsers() {
    return new Promise(resolve => {
        db.find({ online: true }, async (err, docs) => {
            if (err) {
                return resolve([]);
            }
            resolve(docs);
        });
    });
}

function getPurgeWherePredicate(options) {
    return function () {
        const user = this;
        if (options.mixer && !user.twitch) {
            return true;
        }
        if (!user.twitch) return false;

        let daysInactive = 0;
        if (options.daysSinceActive.enabled) {
            daysInactive = moment().diff(moment(user.lastSeen), "days");
        }
        const viewTimeHours = user.minutesInChannel / 60;

        if ((options.daysSinceActive.enabled || options.viewTimeHours.enabled || options.chatMessagesSent.enabled) &&
            (!options.daysSinceActive.enabled || daysInactive > options.daysSinceActive.value) &&
            (!options.viewTimeHours.enabled || viewTimeHours < options.viewTimeHours.value) &&
            (!options.chatMessagesSent.enabled || user.chatMessages < options.chatMessagesSent.value)) {
            return true;
        }
        return false;
    };
}

/**
 * @returns {Promise<TwitchbotUser[]>}
 */
function getPurgeUsers(options) {
    return new Promise(resolve => {
        db.find({ $where: getPurgeWherePredicate(options) }, (err, docs) => {
            if (err) {
                return resolve([]);
            }
            resolve(docs);
        });
    });
}

function purgeUsers(options) {
    return new Promise(resolve => {
        const backupManager = require("../backupManager");
        backupManager.startBackup(false, () => {
            db.remove({ $where: getPurgeWherePredicate(options) }, { multi: true },
                (err, numRemoved) => {
                    if (err) {
                        return resolve(0);
                    }
                    resolve(numRemoved);
                });
        });
    });
}

/**
 * @typedef {Object} UserDetails
 * @property {number} id
 * @property {string} username
 * @property {string} displayName
 * @property {string} profilePicUrl
 * @property {string[]} twitchRoles
 */

/**
 * Set a user as online
 * @param {UserDetails} userDetails
 */
function setChatUserOnline(userDetails) {
    return new Promise((resolve) => {
        if (!isViewerDBOn()) {
            return resolve();
        }

        const now = Date.now();

        db.update(
            { _id: userDetails.id },
            {
                $set: {
                    username: userDetails.username,
                    displayName: userDetails.displayName,
                    profilePicUrl: userDetails.profilePicUrl,
                    twitchRoles: userDetails.twitchRoles,
                    online: true,
                    onlineAt: now,
                    lastSeen: now
                }
            },
            {},
            function (err) {
                if (err) {
                    logger.error("Failed to set user to online", err);
                }
                resolve();
            });
    });
}

/**
 * Adds a new user to the database
 * @param {UserDetails} userDetails
 */
function addNewUserFromChat(userDetails, isOnline = true) {
    return createNewUser(userDetails.id, userDetails.username, userDetails.displayName,
        userDetails.profilePicUrl, userDetails.twitchRoles, isOnline);
}

// Sets chat users online using the same function we use to get the chat viewer list for the ui.
async function setChatUsersOnline() {
    const viewers = await twitchChat.getViewerList();

    if (viewers == null) {
        return;
    }

    for (const viewer of viewers) {

        // Here we convert the viewer list viewer object to one that matches
        // what we get from chat messages...
        const viewerPacket = {
            id: viewer.userId,
            username: viewer.username,
            roles: viewer.user_roles
        };

        setChatUserOnline(viewerPacket);
    }
}
//set user to followed
function setChatUserFollowed(id) {
    return new Promise((resolve, reject) => {
        if (!isViewerDBOn()) {
            return resolve();
        }
        // Find the user by id to set their isFollowed true.
        db.find({ _id: id }, (err, user) => {
            if (err) {
                logger.error(err);
                return;
            }
            if (user == null || user.length < 1) {
                return;
            }
            //返回结果是数组，且只有1条数据
            db.update({ _id: user[0]._id }, { $set: { isFollowed: true } }, {}, function (err) {
                if (err) {
                    logger.error("ViewerDB: Error setting user to isFollowed.", err);
                } else {
                    logger.debug("ViewerDB: Set " + user[0].username + "(" + user[0]._id + ") to isFollowed.");
                }
                return resolve();
            });
        }); // End find
    });
}
// set user to bot
function setChatUserBot(id) {
    return new Promise((resolve, reject) => {
        if (!isViewerDBOn()) {
            return resolve();
        }
        // Find the user by id to set their isNewViewer false.
        db.find({ _id: id }, (err, user) => {
            if (err) {
                logger.error(err);
                return;
            }
            if (user == null || user.length < 1) {
                return;
            }
            db.update({ _id: user[0]._id }, { $set: { isBot: true } }, {}, function (err) {
                if (err) {
                    logger.error("ViewerDB: Error setting user to bot.", err);
                } else {
                    logger.debug("ViewerDB: Set " + user[0].username + "(" + user[0]._id + ") to bot.");
                }
                return resolve();
            });
        }); // End find
    });
}

//set user to oldviewer,
function setChatUserOldViewer(id) {
    return new Promise((resolve, reject) => {
        if (!isViewerDBOn()) {
            return resolve();
        }
        // Find the user by id to set their isNewViewer false.
        db.find({ _id: id }, (err, user) => {
            if (err) {
                logger.error(err);
                return;
            }
            if (user == null || user.length < 1) {
                return;
            }
            db.update({ _id: user[0]._id }, { $set: { isNewViewer: false } }, {}, function (err) {
                if (err) {
                    logger.error("ViewerDB: Error setting user to oldViewer.", err);
                } else {
                    logger.debug("ViewerDB: Set " + user[0].username + "(" + user[0]._id + ") to oldViewer.");
                }
                return resolve();
            });
        }); // End find
    });
}
//清除用户的角色
async function resetAllUserCurrentRoles() {
    return new Promise(resolve => {
        if (!isViewerDBOn() || db == null) {
            return resolve();
        }
        //1.重置当前数据库中Roles的角色为空
        db.update({$or: [{twitchRoles: {$size: 1}}, {twitchRoles: {$size: 2}}]}, {$set: {twitchRoles: []}}, {multi: true}, function (err, numReplaced) {
            if (numReplaced > 0) {
                logger.debug('ViewerDB: Set ' + numReplaced + ' users to oldViewer.');
            } else {
                logger.debug('ViewerDB: No users were set to oldViewer.');
            }
            resolve();
        });
    });
}
async function getIdsToResetRoles() {
    return new Promise(resolve => {
        if (!isViewerDBOn() || db == null) {
            return resolve();
        }
        //1.重置当前数据库中Roles的角色为空
        db.find({$or: [{twitchRoles: {$size: 1}}, {twitchRoles: {$size: 2}}]}, function (err, users) {
            resolve(Object.values(users));
        });
    });
}
//通过用户id更新userdb中用户的角色
async function updateUserRoles(userRoleInfo) {
    return new Promise(resolve => {
        if (!isViewerDBOn() || db == null) {
            return resolve();
        }
        // 更新用户的角色信息
        db.find({ _id: userRoleInfo.id }, (err, user) => {
            if (err) {
                logger.error(err);
                return;
            }
            if (user == null || user.length < 1) {
                return;
            }
            db.update({ _id: user[0]._id }, { $set: { twitchRoles: userRoleInfo.roles } }, {}, function (err) {
                if (err) {
                    logger.error("ViewerDB: Error setting user to vip,mod or subscriber.", err);
                } else {
                    logger.debug("ViewerDB: Set " + user[0].username + "(" + user[0]._id + ") to " + userRoleInfo.roles);
                }
                return resolve();
            });
        }); // End find
    });
}
//通过userId在userdb中添加用户的某个角色信息
async function addUserRoleInfo(userId, addedRole) {
    return new Promise(resolve => {
        if (!isViewerDBOn() || db == null) {
            return resolve();
        }
        // 更新用户的角色信息
        db.find({ _id: userId }, (err, user) => {
            if (err) {
                logger.error(err);
                return;
            }
            if (user == null || user.length < 1) {
                return;
            }
            let userRoles = user[0].twitchRoles;
            //是用户自己设置权限，可能会重复给某个角色添加
            if (userRoles.includes(addedRole)) {
                return;
            }
            userRoles.push(addedRole);
            db.update({ _id: userId }, { $set: { twitchRoles: userRoles } }, {}, function (err) {
                if (err) {
                    logger.error("ViewerDB: Error setting user to vip,mod or subscriber.", err);
                } else {
                    logger.debug("ViewerDB: Add " + user[0].username + "(" + user[0]._id + ") with " + addedRole);
                }
                return resolve();
            });
        }); // End find
    });
}
//通过userId在userdb中移除用户的某个角色信息
async function removeUserRoleInfo(userId, removedRole) {
    return new Promise(resolve => {
        if (!isViewerDBOn() || db == null) {
            return resolve();
        }
        // 更新用户的角色信息
        db.find({ _id: userId }, (err, user) => {
            if (err) {
                logger.error(err);
                return;
            }
            if (user == null || user.length < 1) {
                return;
            }
            let userRoles = user[0].twitchRoles;
            //是用户自己设置权限，移除的角色可能不包含该角色
            if (!userRoles.includes(removedRole)) {
                return;
            }
            userRoles = userRoles.filter(item => item !== removedRole);
            db.update({ _id: userId }, { $set: { twitchRoles: userRoles } }, {}, function (err) {
                if (err) {
                    logger.error("ViewerDB: Error setting user to vip,mod or subscriber.", err);
                } else {
                    logger.debug("ViewerDB: Remove " + user[0].username + "(" + user[0]._id + ") with " + removedRole);
                }
                return resolve();
            });
        }); // End find
    });
}
//set all user to oldviewer
function setAllUsersOldViewer() {
    return new Promise(resolve => {
        if (!isViewerDBOn() || db == null) {
            return resolve();
        }

        logger.debug('ViewerDB: Trying to set all users to offline.');

        db.update({ isNewViewer: true }, { $set: { isNewViewer: false } }, { multi: true }, function (err, numReplaced) {
            if (numReplaced > 0) {
                logger.debug('ViewerDB: Set ' + numReplaced + ' users to oldViewer.');
            } else {
                logger.debug('ViewerDB: No users were set to oldViewer.');
            }
            resolve();
        });
    });
}
//set user offline, update time spent records
function setChatUserOffline(id) {
    return new Promise((resolve, reject) => {
        if (!isViewerDBOn()) {
            return resolve();
        }

        // Find the user by id to get their minutes viewed.
        // Update their minutes viewed with our new times.
        db.find({ _id: id }, (err, user) => {
            if (err) {
                logger.error(err);
                return;
            }
            if (user == null || user.length < 1) {
                return;
            }
            db.update({ _id: user[0]._id }, { $set: { online: false } }, {}, function (err) {
                if (err) {
                    logger.error("ViewerDB: Error setting user to offline.", err);
                } else {
                    logger.debug("ViewerDB: Set " + user[0].username + "(" + user[0]._id + ") to offline.");
                }
                return resolve();
            });
        }); // End find
    });
}

//set everyone offline mostly for when we start up or disconnect
function setAllUsersOffline() {
    return new Promise(resolve => {
        if (!isViewerDBOn() || db == null) {
            return resolve();
        }

        logger.debug('ViewerDB: Trying to set all users to offline.');

        db.update({ online: true }, { $set: { online: false } }, { multi: true }, function (err, numReplaced) {
            if (numReplaced > 0) {
                logger.debug('ViewerDB: Set ' + numReplaced + ' users to offline.');
            } else {
                logger.debug('ViewerDB: No users were set to offline.');
            }
            resolve();
        });
    });
}

twitchChat.on("connected", () => {
    setChatUsersOnline();
});

twitchChat.on("disconnected", () => {
    setAllUsersOffline();
});

//establish the connection, set everyone offline, start last seen timer
function connectUserDatabase() {
    logger.info('ViewerDB: Trying to connect to user database...');
    if (!isViewerDBOn()) {
        return;
    }

    let path = profileManager.getPathInProfile("db/users.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.info("ViewerDB: Error Loading Database: ", err.message);
            logger.info("ViewerDB: Failed Database Path: ", path);
        }
    });

    // Setup our automatic compaction interval to shrink filesize.
    db.persistence.setAutocompactionInterval(dbCompactionInterval);
    setInterval(function () {
        logger.debug('ViewerDB: Compaction should be happening now. Compaction Interval: ' + dbCompactionInterval);
    }, dbCompactionInterval);

    logger.info("ViewerDB: User Database Loaded: ", path);
    setAllUsersOffline();

    // update online users lastSeen prop every minute
    updateLastSeenIntervalId = setInterval(setLastSeenDateTime, 60000);

    // Update online user minutes every 1 minutes.
    updateTimeIntervalId = setInterval(calcAllUsersOnlineMinutes, 60000);

    //定时任务加经验
    updateUserXPIntervalId = setInterval(calcAllUsersXPPool, 60000);
}


function getAllUsers() {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve([]);
        }
        db.find({}, function (err, users) {
            resolve(Object.values(users));
        });
    });
}

// This returns all rows from our DB for use in our UI.
function getRowsForUI() {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve();
        }
        let rowData = [];

        // Find all documents in the collection
        // Make sure the row ids you're sending back match the DB defs.
        db.find({}, function (err, users) {
            Object.keys(users).forEach(function (k, user) {
                let userEntry = users[user];
                // Push to row.
                rowData.push(userEntry);
            });
            resolve(rowData);
        });
    });
}

// This takes user input from frontend and sanitizes it for the backend.
// SANITIZE MY BACKEND EBIGGZ
async function sanitizeDbInput(changePacket) {
    if (!isViewerDBOn()) {
        return;
    }
    switch (changePacket.field) {
    case "lastSeen":
    case "joinDate":
        changePacket.value = moment(changePacket.value).valueOf();
        break;
    case "minutesInChannel":
    case "mixPlayInteractions":
    case "chatMessages":
        changePacket.value = parseInt(changePacket.value);
        break;
    default:
    }
    return changePacket;
}

// This will update a cell in the DB with new information.
// Change Packet: {userId: 0000, field: "username", value: "newUsername"}
function updateDbCell(changePacket) {
    if (!isViewerDBOn()) {
        return;
    }

    sanitizeDbInput(changePacket).then(function (changePacket) {
        let id = changePacket.userId,
            field = changePacket.field,
            newValue = changePacket.value;

        let updateDoc = {};
        updateDoc[field] = newValue;

        db.update({ _id: id }, { $set: updateDoc }, {}, function (err) {
            if (err) {
                logger.error("Error adding currency to user.", err);
            }
        });
    });
}

function incrementDbField(userId, fieldName) {
    return new Promise(resolve => {
        if (!isViewerDBOn()) {
            return resolve();
        }

        let updateDoc = {};
        updateDoc[fieldName] = 1;
        db.update({ _id: userId, disableAutoStatAccrual: { $ne: true } }, { $inc: updateDoc }, { returnUpdatedDocs: true }, function (err, _, updatedDoc) {
            if (err) {
                logger.error(err);
            } else {
                if (updatedDoc != null) {
                    let updateObj = {};
                    updateObj[fieldName] = util.commafy(updatedDoc[fieldName]);
                }
            }
            resolve();
        });
    });
}

function getFollowedUserFromDb() {
    return new Promise(resolve => {
        db.find({isFollowed: true}, (err, docs) => {
            if (!err) {
                return resolve(docs);
            }
        });
    });
}
//////////////////
// Event Listeners

frontendCommunicator.onAsync("getPurgePreview", (options) => {
    if (!isViewerDBOn()) {
        return Promise.resolve([]);
    }
    return getPurgeUsers(options);
});

frontendCommunicator.onAsync("purgeUsers", (options) => {
    if (!isViewerDBOn()) {
        return Promise.resolve(0);
    }
    return purgeUsers(options);
});

frontendCommunicator.onAsync("getAllViewers", () => {
    if (!isViewerDBOn()) {
        return Promise.resolve([]);
    }
    return getAllUsers();
});

frontendCommunicator.onAsync("getViewerTwitchbotData", (userId) => {
    return getUserById(userId);
});
frontendCommunicator.onAsync("getFollowedUsers", async() => {
    let followData = await getFollowedUserFromDb() || [];
    return followData || [];
});

//获取用户id,username,profilePicUrl和twitchRoles服务于 LeaderShip
frontendCommunicator.onAsync("getSimplifyAllViewers", async() => {
    let simplifyAllViewers = await getAllUsers();
    //简化数据字段
    let simplifyAllViewersPreResult = simplifyAllViewers.map(({_id, username, profilePicUrl, twitchRoles, twitch, lastSeen}) => {
        return {_id, username, profilePicUrl, twitchRoles, twitch, lastSeen};
    });
    //对数据中的twitchRoles进行修改,如果什么都没有，就认为是regular角色
    let simplifyAllViewersResult = simplifyAllViewersPreResult.map(item => {
        if (item.twitchRoles.length === 0) {
            item.twitchRoles.push("regular");
        }
        return item;
    });
    return simplifyAllViewersResult || [];
});

frontendCommunicator.onAsync("createViewerTwitchbotData", data => {
    //return createNewUser(data.id, data.username, data.roles);
});

frontendCommunicator.on("removeViewerFromDb", userId => {
    removeUser(userId);
});

frontendCommunicator.onAsync("getViewerDetails", (userId) => {
    return userAccess.getUserDetails(userId);
});

frontendCommunicator.on("updateViewerRole", (data) => {
    const { userId, role, addOrRemove } = data;
    //await twitchApi.users.updateUserRole(userId, role, addOrRemove);
});

frontendCommunicator.on("toggleFollowOnChannel", (data) => {
    const twitchApi = require("../twitch-api/api");
    const { channelIdToFollow, shouldFollow } = data;
    twitchApi.users.toggleFollowOnChannel(channelIdToFollow, shouldFollow);
});

frontendCommunicator.on("updateViewerDataField", (data) => {
    const { userId, field, value } = data;

    let updateObject = {};
    updateObject[field] = value;

    db.update({ _id: userId }, { $set: updateObject }, { returnUpdatedDocs: true }, function (err, _, updatedDoc) {
        if (err) {
            logger.error("Error updating user.", err);
        }
    });
});

frontendCommunicator.onAsync("insertOrUpdateUserChatMessagePoints", userId => {
    insertOrUpdateChatMessagePoints(userId);
});

// Return db rows for the ui to use.
ipcMain.on("request-viewer-db", event => {
    if (!isViewerDBOn()) {
        return;
    }
    getRowsForUI().then(rows => {
        event.sender.send("viewer-db-response", rows);
    });
});


// Get change info from UI.
ipcMain.on("viewer-db-change", (event, data) => {
    if (!isViewerDBOn()) {
        return;
    }
    updateDbCell(data);
});

// Connect to the DBs
ipcMain.on("viewerDbConnect", event => {
    if (!isViewerDBOn()) {
        return;
    }
    connectUserDatabase();
    logger.debug("Connecting to user database.");
});

// Disconnect from DBs
ipcMain.on("viewerDbDisconnect", (event, data) => {
    setAllUsersOffline();
    db = null;

    // Clear the online time calc interval.
    clearInterval(updateTimeIntervalId);
    clearInterval(updateLastSeenIntervalId);
    clearInterval(updateUserXPIntervalId);

    logger.debug("Disconnecting from user database.");
});

exports.connectUserDatabase = connectUserDatabase;
exports.setChatUserOnline = setChatUserOnline;
exports.setChatUserOffline = setChatUserOffline;
exports.setAllUsersOffline = setAllUsersOffline;
exports.getUserOnlineMinutes = getUserOnlineMinutes;
exports.getUserByUsername = getUserByUsername;
exports.getUserById = getUserById;
exports.getMixerUserByUsername = getMixerUserByUsername;
exports.getTwitchUserByUsername = getTwitchUserByUsername;
exports.incrementDbField = incrementDbField;
exports.getUserDb = getUserDb;
exports.removeUser = removeUser;
exports.updateUser = updateUser;
exports.setChatUsersOnline = setChatUsersOnline;
exports.getTopViewTimeUsers = getTopViewTimeUsers;
exports.addNewUserFromChat = addNewUserFromChat;
exports.getOnlineUsers = getOnlineUsers;
exports.updateUserMetadata = updateUserMetadata;
exports.getUserMetadata = getUserMetadata;
exports.getAllUsernames = getAllUsernames;
exports.setChatUserBot = setChatUserBot;
exports.setChatUserOldViewer = setChatUserOldViewer;
exports.setAllUsersOldViewer = setAllUsersOldViewer;
exports.setChatUserFollowed = setChatUserFollowed;
exports.calOldViewer = calOldViewer;
exports.calNewViewer = calNewViewer;
exports.resetAllUserCurrentRoles = resetAllUserCurrentRoles;
exports.updateUserRoles = updateUserRoles;
exports.addUserRoleInfo = addUserRoleInfo;
exports.removeUserRoleInfo = removeUserRoleInfo;
exports.getIdsToResetRoles = getIdsToResetRoles;
exports.getAllUsers = getAllUsers;