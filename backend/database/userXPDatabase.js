"use strict";

const Datastore = require('nedb');
const profileManager = require("../common/profile-manager");
const xphistoryDb = require("../database/xpHistoryDatabase");
const frontendCommunicator = require("../common/frontend-communicator");
const twitchEventsHandler = require("../events/twitch-events");
const jsonDataHelpers = require("../common/json-data-helpers");
const logger = require("../logwrapper");
const moment = require("moment");

let kolCanSend = true;
let kolUserNameString = "";
let kolUserLevelList = "";
// const { resolve, reject } = require('bluebird');
// const { quote } = require('underscore.string');
/**
 * @type Datastore
 */
let db;

function loadUserXPDatabase() {
    let path = profileManager.getPathInProfile("/db/userxp.db");
    db = new Datastore({ filename: path });
    db.loadDatabase(err => {
        if (err) {
            logger.error("Error Loading Database: ", err.message);
            logger.debug("Failed DataBase Path: ", path);
        }
    });
}

function getUserXPDb() {
    return db;
}

//use userId to send user name List;
function kolSendLevelUpMsg() {
    //only when  kolCanSend is true and kolUserNameString not null, it will autoreply thanks message!
    if (kolCanSend && kolUserNameString !== "") {
        let kolNamecount = 5;

        let kolNameList = kolUserNameString.split(" ");
        let kolLevelList = kolUserLevelList.split(" ");

        if (kolNameList.length > kolNamecount) {
            kolUserNameString = "";
            kolUserLevelList = "";
            for (let i = 0; i < kolNamecount; i++) {
                if (i === kolNamecount - 1) {
                    kolUserNameString = kolUserNameString + kolNameList[i] + ",";
                    kolUserLevelList = kolUserLevelList + kolLevelList[i] + ",";
                } else {
                    kolUserNameString = kolUserNameString + kolNameList[i] + ", ";
                    kolUserLevelList = kolUserLevelList + kolLevelList[i] + ", ";
                }
            }
            kolUserNameString = kolUserNameString + "etc.";
            kolUserLevelList = kolUserLevelList + "etc.";
        }
        twitchEventsHandler.levelUp.triggerLevelUp(kolUserNameString, kolUserLevelList);
        kolUserNameString = "";
        kolUserLevelList = "";

        kolCanSend = false;
        setTimeout(() => {
            kolCanSend = true;
            kolSendLevelUpMsg();
        }, 30 * 1000);
    }
}

function kolCheckAndSendLevelUpNotification(userName, userLevel) {
    let levelUpNotification = jsonDataHelpers.getStringOrBoolDataMsgs('/loyalty-community/loyalsetting', '/levelUpNotification');
    if (levelUpNotification) {
        kolUserNameString = kolUserNameString + userName + " ";
        kolUserLevelList = kolUserLevelList + userLevel + " ";
        if (kolCanSend) {
            kolSendLevelUpMsg();
        }
    }
}
//计算用户升级后的等级信息
function calculateLevel(userLV, levelUpNeededXP, toCurrentLVTotalXP, totalXP) {
    while (totalXP > levelUpNeededXP + toCurrentLVTotalXP) {
        userLV++;
        toCurrentLVTotalXP = levelUpNeededXP + toCurrentLVTotalXP;
        levelUpNeededXP = 5 * (userLV * userLV) + (50 * userLV) + 100;
    }
    //返回升级后的用户等级信息
    return [userLV, levelUpNeededXP, toCurrentLVTotalXP];
}

//初始化用户信息
function initUserXP (user) {
    //检查loyalsetting.json文件是否存在，不存在就初始化。
    const jsonDataHelpers = require("../common/json-data-helpers");
    let loyalsetting = jsonDataHelpers.getObjectDataMsgs('/loyalty-community/loyalsetting', '/');
    if (!(loyalsetting.hasOwnProperty("bonusSetting") && loyalsetting.hasOwnProperty("levelUpNotification") && loyalsetting.hasOwnProperty("levelUpNotificationMessage"))) {
        //默认值不存在，就初始化其信息
        loyalsetting = {
            bonusSetting: {
                viewTimeBonus: 5,
                chatBonus: 1,
                followBonus: 100,
                subAndGiftSubBonus: 0,
                bitBonus: 0
            },
            levelUpNotification: false,
            levelUpNotificationMessage: "@{username},you just advanced to level {level_num}!"
        };
        jsonDataHelpers.saveDataMsg('/loyalty-community/loyalsetting', '/', loyalsetting);
    }
    //viewTime的经验数据处理
    let viewTimes = user.minutesInChannel;
    let viewTimeXP = 0;
    let lastViewTimesWhenAddedXP = 0;
    if (viewTimes >= 5) {
        lastViewTimesWhenAddedXP = viewTimes;
        viewTimeXP = Math.floor(viewTimes / 5) * loyalsetting.bonusSetting.viewTimeBonus;
    }
    //chatMessage的经验数据处理
    let chatMessages = user.chatMessages;
    let lastChatMessages = chatMessages;
    let chatMessagesXP = chatMessages * loyalsetting.bonusSetting.chatBonus;
    //follow的经验数据处理
    let followedXPAddedStatus = user.isFollowed;
    let followedXP = (followedXPAddedStatus ? 1 : 0) * loyalsetting.bonusSetting.followBonus;
    //subscription的经验数据处理
    let subscriptionsXP = 0;
    //bitsXP的经验数据处理
    let bitsXP = 0;
    let totalXP = viewTimeXP + chatMessagesXP + followedXP + subscriptionsXP + bitsXP;
    //计算初始等级信息 levelUpResult信息如下[userLV, levelUpNeededXP, toCurrentLVTotalXP]
    let levelUpResult = calculateLevel(0, 100, 0, totalXP);
    //写入数据信息
    db.insert({
        _id: user._id,
        lastViewTimesWhenAddedXP: lastViewTimesWhenAddedXP, //上次加观看时长经验值的viewTimes，用于定时任务时比对增加的时长,判断是否需要加经验值
        viewTimesXP: viewTimeXP, //观看时长的经验
        lastChatMessages: lastChatMessages, //上次聊天消息数，用于定时任务时比对增加的聊天消息数
        chatMessagesXP: chatMessagesXP,
        followedXP: followedXP,
        followedXPAddedStatus: followedXPAddedStatus, //设置一个状态，标识用户的观众经验值是否已添加，
        subscriptionsXP: subscriptionsXP, //gift和subgift的经验
        bitsXP: bitsXP,
        totalXP: totalXP, //用户总经验
        userLV: levelUpResult[0], //用户等级，从totalXP中计算
        levelUpNeededXP: levelUpResult[1], //升级到下一级需要的经验值XP = 5 * (lvl ^ 2) + (50 * lvl) + 100
        toCurrentLVTotalXP: levelUpResult[2], //升级到下一级总共需要的经验totalXP < (levelUpNeededXP + toCurrentLVTotalXP)
        updatedAt: new Date().getTime() //时间戳，毫秒,记录上次获得XP的时间
    }, function(err, doc) {
        if (err) {
            logger.error("userxp insert error");
        } else {
            logger.debug("userxp insert success");
        }
    });
    let userInitInfo = {
        userId: user._id,
        currentXP: 0,
        type: 'userInitInfo', //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
        xpAdded: totalXP,
        totaclXP: totalXP
    };
    xphistoryDb.insertXPHistory(userInitInfo, 'init');//原因是初始化
}
//检测是否有需要初始化的新用户
function initAllUserXP() {
    let userXPInitedResult = false;
    try {
        userXPInitedResult = profileManager.getJsonDbInProfile("/settings").getData("/userXPInited");
    } catch {
        logger.error("Failed to get userXPInit status, then Init userXP");
    }
    if (!userXPInitedResult) {
        const userdb = require("./userDatabase");
        let userDataBase = userdb.getUserDb();
        userDataBase.find({}, function (err, docs) {
            for (let i = 0; i < docs.length; i++) {
                let user = docs[i];
                initUserXP(user);
            }
        });
        try {
            profileManager.getJsonDbInProfile("/settings").push("/userXPInited", true, true);
            logger.debug("Init userXP successfully");
        } catch (err) {
            logger.error("Failed to init userXP");
        }
    }
}

//更新单个用户在线时长经验,与关注经验, 计算方法f(x,y)= floor(viewTime/x) * viewTimebonus;每x=5分钟加viewTimebonus经验；
function updateUserViewTimeXP(user, init = false, viewTimeXPBonus = 5, x = 5) {
    //正式查询插入
    db.find({_id: user._id}, function(err, doc) {
        if (!err) {
            //如果找到了，就更新数据信息
            if (doc.length) {
                //1.获取用户新增的在线观看时长
                let viewTimes = user.minutesInChannel;
                let viewTimesAdded = viewTimes - doc[0].lastViewTimesWhenAddedXP;
                //判断是否满足增加观看时长经验条件
                if (viewTimesAdded < 5) {
                    //增加的时长不足5分钟，不用加经验值，不用处理
                    return;
                }
                //2.计算用户观看时长新增经验值
                let viewTimesAddedXP = Math.floor(viewTimesAdded / x) * viewTimeXPBonus;
                let currentXP = doc[0].viewTimesXP + doc[0].chatMessagesXP + doc[0].followedXP + doc[0].subscriptionsXP + doc[0].bitsXP;
                let totalXP = currentXP + viewTimesAddedXP;//计算得到的总积分
                //3.写增加日志（注重点：增加的原因为init)
                let viewTimeXPHistoryInfo = {
                    userId: user._id,
                    currentXP: currentXP,
                    type: 'viewTimes', //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
                    xpAdded: viewTimesAddedXP,
                    totaclXP: totalXP
                };
                if (init) {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'init');//原因是初始化
                } else {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'viewTime poll');//原因是观看时长定时轮询
                }
                //4.增加经验 并判断用户是否升级
                if (totalXP > doc[0].levelUpNeededXP + doc[0].toCurrentLVTotalXP) {
                    //levelUpResult信息如下[userLV, levelUpNeededXP, toCurrentLVTotalXP]
                    let levelUpResult = calculateLevel(doc[0].userLV, doc[0].levelUpNeededXP, doc[0].toCurrentLVTotalXP, totalXP);

                    //5.更新用户经验(lastViewTimesWhenAddedXP, viewTimeXP, 和totalXP),以及用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        lastViewTimesWhenAddedXP: viewTimes,
                        viewTimesXP: doc[0].viewTimesXP + viewTimesAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime(),
                        userLV: levelUpResult[0],
                        levelUpNeededXP: levelUpResult[1],
                        toCurrentLVTotalXP: levelUpResult[2]
                    }}, {}, function(err) {
                        if (err) {
                            logger.error("ViewerDB: Error update updateUserViewTimeXP.", err);
                        } else {
                            logger.debug("ViewerDB: Success update updateUserViewTimeXP");
                        }
                    });
                    //6.待做：发送通知信息
                    kolCheckAndSendLevelUpNotification(user.username, levelUpResult[0]);
                } else {
                    //5.更新用户经验(lastViewTimesWhenAddedXP, viewTimeXP, 和totalXP),因为没升级，不用加入用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        lastViewTimesWhenAddedXP: viewTimes,
                        viewTimesXP: doc[0].viewTimesXP + viewTimesAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime()
                    }}, {}, function() {});
                }
            } else {
                //没有找到就更新该用户
                initUserXP(user);
            }
        } else {
            logger.error("updateUserViewTimeXP error");
            logger.error(err);
        }
    });
}

//更新单个用户聊天经验,计算方法f(x,y)= floor(chatMessage/x) * y;每x条聊天记录加y经验；
function updateUserChatMessageXP(user, init = false, chatBonus = 1, x = 1) {
    db.find({_id: user._id}, function(err, doc) {
        if (!err) {
            //如果找到了，就更新数据信息
            if (doc.length) {
                //1.获取用户新增的聊天数
                let chatMessages = user.chatMessages;
                let chatMessagesAdded = chatMessages - doc[0].lastChatMessages;
                //2.计算用户新增聊天数经验值
                let chatMessagesAddedXP = Math.floor(chatMessagesAdded / x) * chatBonus;
                let currentXP = doc[0].viewTimesXP + doc[0].chatMessagesXP + doc[0].followedXP + doc[0].subscriptionsXP + doc[0].bitsXP;
                let totalXP = currentXP + chatMessagesAddedXP;//计算得到的总积分
                //3.写增加日志（注重点：增加的原因)
                let viewTimeXPHistoryInfo = {
                    userId: user._id, //用户id
                    currentXP: currentXP,
                    type: 'chatMessage', //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
                    xpAdded: chatMessagesAddedXP,
                    totaclXP: totalXP
                };
                if (init) {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'init');//原因是初始化
                } else {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'chatMessage poll');//原因是聊天记录定时轮询
                }
                //4.判断用户是否升级
                if (totalXP > doc[0].levelUpNeededXP + doc[0].toCurrentLVTotalXP) {
                    //levelUpResult信息如下[userLV, levelUpNeededXP, toCurrentLVTotalXP]
                    let levelUpResult = calculateLevel(doc[0].userLV, doc[0].levelUpNeededXP, doc[0].toCurrentLVTotalXP, totalXP);

                    //5.更新用户经验(lastChatMessages, chatMessagesXP, 和totalXP),以及用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        lastChatMessages: chatMessages,
                        chatMessagesXP: doc[0].chatMessagesXP + chatMessagesAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime(),
                        userLV: levelUpResult[0],
                        levelUpNeededXP: levelUpResult[1],
                        toCurrentLVTotalXP: levelUpResult[2]
                    }}, {}, function() {});
                    //6.待做：发送通知信息
                    kolCheckAndSendLevelUpNotification(user.username, levelUpResult[0]);
                } else {
                    //5.更新用户经验(lastChatMessages, chatMessagesXP, 和totalXP),因为没升级，不用加入用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        lastChatMessages: chatMessages,
                        chatMessagesXP: doc[0].chatMessagesXP + chatMessagesAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime()
                    }}, {}, function(err) {
                        if (err) {
                            logger.error("ViewerDB: Error update UserChatMessageXP.", err);
                        } else {
                            logger.debug("ViewerDB: Success update UserChatMessageXP.");
                        }
                    });
                }
            } else {
                //没有找到就插入，并更新该用户
                initUserXP(user);
            }
        } else {
            logger.error("updateUserChatMessageXP error");
            logger.error(err);
        }
    });
}

//更新单个用户在线时长经验,与聊天经验
function updateUserViewTimeAndChatMessageXP(user, init = false, viewTimeXPBonus = 5, chatBonus = 1) {
    //正式查询插入
    db.find({_id: user._id}, function(err, doc) {
        if (!err) {
            //如果找到了，就更新数据信息
            if (doc.length) {
                //1.观看时长与聊天记录数据信息
                let viewTimes = user.minutesInChannel;
                let viewTimesAdded = viewTimes - doc[0].lastViewTimesWhenAddedXP;
                let chatMessages = user.chatMessages;
                let chatMessagesAdded = chatMessages - doc[0].lastChatMessages;
                //如果该用户既没有发言，新增的观看时长不足5分钟无法加经验
                if (viewTimesAdded < 5 && chatMessagesAdded < 1) {
                    return;
                } else if (viewTimesAdded < 5 && chatMessagesAdded >= 1) { //观看时长不变，聊天经验增加
                    updateUserChatMessageXP(user, init, chatBonus);
                } else if (viewTimesAdded >= 5 && chatMessagesAdded < 1) { //观看时长加经验，聊天经验不变
                    updateUserViewTimeXP(user, init, viewTimeXPBonus);
                } else { //同时加观看时长和聊天经验
                    //2计算观看时长与聊天增加的经验值
                    let viewTimesAddedXP = Math.floor(viewTimesAdded / 5) * viewTimeXPBonus;
                    let chatMessagesAddedXP = Math.floor(chatMessagesAdded / 1) * chatBonus;
                    let currentXP = doc[0].viewTimesXP + doc[0].chatMessagesXP + doc[0].followedXP + doc[0].subscriptionsXP + doc[0].bitsXP;
                    let totalXP = currentXP + viewTimesAddedXP + chatMessagesAddedXP;//计算得到的总积分
                    //3.写聊天经验与观看时长的增加历史记录
                    let viewTimeAndChatMessageXPHistoryInfo = {
                        userId: user._id,
                        currentXP: currentXP,
                        type: 'viewTimeAndChatMessage', //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
                        xpAdded: viewTimesAddedXP + chatMessagesAddedXP,
                        totaclXP: totalXP
                    };
                    xphistoryDb.insertXPHistory(viewTimeAndChatMessageXPHistoryInfo, 'viewTime and chatMessage poll');//原因是观看时长定时轮询
                    //4.增加经验 并判断用户是否升级
                    if (totalXP > doc[0].levelUpNeededXP + doc[0].toCurrentLVTotalXP) {
                        //levelUpResult信息如下[userLV, levelUpNeededXP, toCurrentLVTotalXP]
                        let levelUpResult = calculateLevel(doc[0].userLV, doc[0].levelUpNeededXP, doc[0].toCurrentLVTotalXP, totalXP);
                        //5.更新用户经验(lastViewTimesWhenAddedXP, viewTimeXP, 和totalXP),以及用户升级需要加入升级后的信息
                        db.update({_id: doc[0]._id}, {$set: {
                            lastViewTimesWhenAddedXP: viewTimes,
                            viewTimesXP: doc[0].viewTimesXP + viewTimesAddedXP,
                            lastChatMessages: chatMessages,
                            chatMessagesXP: doc[0].chatMessagesXP + chatMessagesAddedXP,
                            totalXP: totalXP,
                            updatedAt: new Date().getTime(),
                            userLV: levelUpResult[0],
                            levelUpNeededXP: levelUpResult[1],
                            toCurrentLVTotalXP: levelUpResult[2]
                        }}, {}, function(err) {
                            if (err) {
                                logger.error("ViewerDB: Error update viewTimeAndChatMessageXP.", err);
                            } else {
                                logger.debug("ViewerDB: success update viewTimeAndChatMessageXP.");
                            }
                        });
                        //6.待做：发送通知信息
                        kolCheckAndSendLevelUpNotification(user.username, levelUpResult[0]);
                    } else {
                        //5.更新用户经验(lastViewTimesWhenAddedXP, viewTimeXP, lastChatMessages, chatMessagesXP 和totalXP),因为没升级，不用加入用户升级需要加入升级后的信息
                        db.update({_id: doc[0]._id}, {$set: {
                            lastViewTimesWhenAddedXP: viewTimes,
                            viewTimesXP: doc[0].viewTimesXP + viewTimesAddedXP,
                            lastChatMessages: chatMessages,
                            chatMessagesXP: doc[0].chatMessagesXP + chatMessagesAddedXP,
                            totalXP: totalXP,
                            updatedAt: new Date().getTime()
                        }}, {}, function(err) {
                            if (err) {
                                logger.error("ViewerDB: Error update viewTimeAndChatMessageXP.", err);
                            } else {
                                logger.debug("ViewerDB: success update viewTimeAndChatMessageXP.");
                            }
                        });
                    }
                }
            } else {
                //没有找到就插入，并更新该用户
                initUserXP(user);
            }
        } else {
            logger.error("updateUserViewTimeAndChatMessageXP error");
            logger.error(err);
        }
    });
}
//更新单个用户关注经验,计算方法f(x,y)= floor(chatMessage/x) * y;关注时加y经验；
function updateUserFollowXP(user, init = false, followBonus = 100) {
    //查询插入
    db.find({_id: user._id}, function(err, doc) {
        if (!err) {
            //如果找到了，就更新数据信息
            if (doc.length) {
                //1.只有未加过关注经验的，才给加，已加过的就不再处理加经验
                if (!doc[0].followedXPAddedStatus) {
                    //2.关注获得的经验值
                    let followedAddedXP = followBonus;
                    let currentXP = doc[0].viewTimesXP + doc[0].chatMessagesXP + doc[0].followedXP + doc[0].subscriptionsXP + doc[0].bitsXP;
                    let totalXP = currentXP + followedAddedXP;//计算得到的总积分
                    //3.写增加日志（注重点：增加的原因)
                    let viewTimeXPHistoryInfo = {
                        userId: user._id, //用户id
                        currentXP: currentXP,
                        type: 'followed', //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
                        xpAdded: followedAddedXP,
                        totaclXP: totalXP
                    };
                    if (init) {
                        xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'init');
                    } else {
                        xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'user followed');
                    }
                    //4.判断用户是否升级
                    if (totalXP > doc[0].levelUpNeededXP + doc[0].toCurrentLVTotalXP) {
                        //levelUpResult信息如下[userLV, levelUpNeededXP, toCurrentLVTotalXP]
                        let levelUpResult = calculateLevel(doc[0].userLV, doc[0].levelUpNeededXP, doc[0].toCurrentLVTotalXP, totalXP);

                        //5.更新用户经验(followedXP, followedXPAddedStatus, 和totalXP),以及用户升级需要加入升级后的信息
                        db.update({_id: doc[0]._id}, {$set: {
                            followedXP: doc[0].followedXP + followedAddedXP,
                            followedXPAddedStatus: true,
                            totalXP: totalXP,
                            updatedAt: new Date().getTime(),
                            userLV: levelUpResult[0],
                            levelUpNeededXP: levelUpResult[1],
                            toCurrentLVTotalXP: levelUpResult[2]
                        }}, {}, function() {});

                        //6.待做：发送通知信息
                        kolCheckAndSendLevelUpNotification(user.username, levelUpResult[0]);
                    } else {
                        //5.更新用户经验(followedXP, followedXPAddedStatus, 和totalXP),因为没升级，不用加入用户升级需要加入升级后的信息
                        db.update({_id: doc[0]._id}, {$set: {
                            followedXP: doc[0].followedXP + followedAddedXP,
                            followedXPAddedStatus: true,
                            totalXP: totalXP,
                            updatedAt: new Date().getTime()
                        }}, {}, function() {});
                    }
                }
            } else {
                //没有找到就插入，并更新该用户
                initUserXP(user);
            }
        }
    });
}

//更新订阅获得的经验,计算方法f(x,y)= floor(chatMessage/x) * y;每x条聊天记录加y经验；
function updateUserSubscriptionXP(user, init = false, subscriptionBonus = 0) {
    db.find({_id: user._id}, function(err, doc) {
        if (!err) {
            //如果找到了，就更新数据信息
            if (doc.length) {
                //1.计算用户新增订阅经验值
                let subscriptionAddedXP = subscriptionBonus;
                let currentXP = doc[0].viewTimesXP + doc[0].chatMessagesXP + doc[0].followedXP + doc[0].subscriptionsXP + doc[0].bitsXP;
                let totalXP = currentXP + subscriptionAddedXP;//计算得到的总积分
                //3.写增加日志（注重点：增加的原因)
                let viewTimeXPHistoryInfo = {
                    userId: user._id, //用户id
                    currentXP: currentXP,
                    type: 'subs', //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
                    xpAdded: subscriptionAddedXP,
                    totaclXP: totalXP
                };
                if (init) {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'init');
                } else {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'user subscription');
                }
                //4.判断用户是否升级
                if (totalXP > doc[0].levelUpNeededXP + doc[0].toCurrentLVTotalXP) {
                    //levelUpResult信息如下[userLV, levelUpNeededXP, toCurrentLVTotalXP]
                    let levelUpResult = calculateLevel(doc[0].userLV, doc[0].levelUpNeededXP, doc[0].toCurrentLVTotalXP, totalXP);

                    //5.更新用户经验(subscriptionsXP, 和totalXP),以及用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        subscriptionsXP: doc[0].subscriptionsXP + subscriptionAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime(),
                        userLV: levelUpResult[0],
                        levelUpNeededXP: levelUpResult[1],
                        toCurrentLVTotalXP: levelUpResult[2]
                    }}, {}, function() {});
                    //6.待做：发送通知信息
                    kolCheckAndSendLevelUpNotification(user.username, levelUpResult[0]);
                } else {
                    //5.更新用户经验(subscriptionsXP, 和totalXP),因为没升级，不用加入用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        subscriptionsXP: doc[0].subscriptionsXP + subscriptionAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime()
                    }}, {}, function() {});
                }
            } else {
                //没有找到就插入，并更新该用户
                initUserXP(user);
            }
        }
    });
}

//更新bits经验,计算方法f(x,y)= floor(chatMessage/x) * y;每x条聊天记录加y经验；
function updateUserbitXP(user, bitsNum, init = false, bitsBonus = 0) {
    db.find({_id: user._id}, function(err, doc) {
        if (!err) {
            //如果找到了，就更新数据信息
            if (doc.length) {
                let bitsAddedXP = bitsNum * bitsBonus;
                let currentXP = doc[0].viewTimesXP + doc[0].chatMessagesXP + doc[0].followedXP + doc[0].subscriptionsXP + doc[0].bitsXP;
                let totalXP = currentXP + bitsAddedXP;//计算得到的总积分
                //2.写增加日志（注重点：增加的原因)
                let viewTimeXPHistoryInfo = {
                    userId: user._id, //用户id
                    currentXP: currentXP,
                    type: 'bits', //增加的类型（'chatMessage','viewTimes','subs','followed','bits'）
                    xpAdded: bitsAddedXP,
                    totaclXP: totalXP
                };
                if (init) {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'init');
                } else {
                    xphistoryDb.insertXPHistory(viewTimeXPHistoryInfo, 'user cheer with bits');
                }
                //3.判断用户是否升级
                if (totalXP > doc[0].levelUpNeededXP + doc[0].toCurrentLVTotalXP) {
                    //levelUpResult信息如下[userLV, levelUpNeededXP, toCurrentLVTotalXP]
                    let levelUpResult = calculateLevel(doc[0].userLV, doc[0].levelUpNeededXP, doc[0].toCurrentLVTotalXP, totalXP);

                    //4.更新用户经验(bitsXP, 和totalXP),以及用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        bitsXP: doc[0].bitsXP + bitsAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime(),
                        userLV: levelUpResult[0],
                        levelUpNeededXP: levelUpResult[1],
                        toCurrentLVTotalXP: levelUpResult[2]
                    }}, {}, function() {});
                    //5.发送通知信息
                    kolCheckAndSendLevelUpNotification(user.username, levelUpResult[0]);
                } else {
                    //5.更新用户经验(bitsXP, 和totalXP),因为没升级，不用加入用户升级需要加入升级后的信息
                    db.update({_id: doc[0]._id}, {$set: {
                        bitsXP: doc[0].bitsXP + bitsAddedXP,
                        totalXP: totalXP,
                        updatedAt: new Date().getTime()
                    }}, {}, function() {});
                }
            } else {
                //没有找到就插入，并更新该用户
                initUserXP(user);
            }
        }
    });
}

function getAllUsers() {
    return new Promise(resolve => {
        db.find({}, function (err, users) {
            resolve(Object.values(users));
        });
    });
}

//获取用户id,username,profilePicUrl和twitchRoles服务于 LeaderShip
frontendCommunicator.onAsync("getSimplifyAllViewersXp", async() => {
    let simplifyAllViewersXp = await getAllUsers();
    let simplifyViewersXpResult = simplifyAllViewersXp.map(({_id, userLV, totalXP, updatedAt}) => {
        return {_id, userLV, totalXP, updatedAt};
    });
    return simplifyViewersXpResult || [];
});

exports.loadUserXPDatabase = loadUserXPDatabase;
exports.getUserXPDb = getUserXPDb;
exports.updateUserViewTimeXP = updateUserViewTimeXP;
exports.updateUserChatMessageXP = updateUserChatMessageXP;
exports.initAllUserXP = initAllUserXP;
exports.updateUserbitXP = updateUserbitXP;
exports.updateUserSubscriptionXP = updateUserSubscriptionXP;
exports.updateUserFollowXP = updateUserFollowXP;
exports.updateUserViewTimeAndChatMessageXP = updateUserViewTimeAndChatMessageXP;