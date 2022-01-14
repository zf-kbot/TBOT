"use strict";
(function() {
    //This manages command data
    const profileManager = require("../../backend/common/profile-manager.js");
    const moment = require("moment");

    angular
        .module("twitcherbotApp")
        .factory("kolTopChartService", function(
            logger,
            connectionService,
            listenerService,
            profileManager,
            backendCommunicator,
            $q
        ) {
            let service = {};
            service.kolChatters = [];
            service.kolEmotes = [];
            service.kolViewTimes = [];
            service.groupBy = function (list, keyGetter) {
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
            };
            service.getKolTopChatters = (queryTime) => {
                if (queryTime.startTime === null || queryTime.endTime === null) {
                    service.kolChatters = [];
                    return;
                }
                $q.when(backendCommunicator.fireEventAsync('getTopChatters', queryTime))
                    .then(chatters => {
                        service.kolChatters = [];
                        let result = service.groupBy(chatters, doc => doc.username);
                        const keys = result.keys();
                        const values = result.values();
                        let sortMessages = [];
                        //写数据到数据组中
                        for (let i = 0; i < result.size; i++) {
                            let value = values.next().value;
                            let message = {
                                "rankId": i + 1,
                                "userId": value[0].userId,
                                "username": keys.next().value,
                                "chatmessages": value.length,
                                "profilePicUrl": value[0].data.data.profilePicUrl
                            };
                            sortMessages.push(message);
                            // service.kolChatters.push(message);
                        }
                        sortMessages = sortMessages.sort(service.descSort("chatmessages"));
                        //取排序好的前25条数据
                        for (let i = 0; i < sortMessages.length && i < 25; i++) {
                            sortMessages[i].rankId = i + 1;
                        }
                        service.kolChatters = sortMessages.slice(0, 25);
                    });
            };
            service.descSort = function compare(property) {
                return function(m, n) {
                    let a = m[property];
                    let b = n[property];
                    return b - a;//b-a降序，a-b升序
                };
            };
            service.getKolTopViewTimes = (queryTime) => {
                if (queryTime.startTime === null || queryTime.endTime === null) {
                    service.kolViewTimes = [];
                    return;
                }
                $q.when(backendCommunicator.fireEventAsync('getTopViewTimes', queryTime))
                    .then(viewTimes => {
                        service.kolViewTimes = [];
                        let result = service.groupBy(viewTimes, doc => doc.userName);
                        const keys = result.keys();
                        const values = result.values();
                        let sortMessages = [];
                        for (let i = 0; i < result.size; i++) {
                            //viewTimes 用于记录该记录的总时长；userTimesArray记录用户积累的时间数组
                            let viewTimes = 0;
                            let userTimesArray = values.next().value;
                            let profilePicUrl = userTimesArray[0].profilePicUrl;
                            let userId = userTimesArray[0].userId;
                            for (let i = 0; i < userTimesArray.length; i++) {
                                viewTimes += userTimesArray[i].viewTime;
                            }

                            let message = {
                                "rankId": i + 1,
                                "userId": userId,
                                "userName": keys.next().value,
                                "viewTimes": viewTimes,
                                "profilePicUrl": profilePicUrl
                            };
                            sortMessages.push(message);
                        }
                        //根据对象数组中对象的某一属性”viewTimes“大小进行排序
                        sortMessages = sortMessages.sort(service.descSort("viewTimes"));
                        //取排序好的前25条数据
                        for (let i = 0; i < sortMessages.length && i < 25; i++) {
                            sortMessages[i].rankId = i + 1;
                            let viewTimes = sortMessages[i].viewTimes;
                            let day = parseInt(viewTimes / 60 / 24);
                            let hr = parseInt(viewTimes / 60 % 24);
                            let min = parseInt(viewTimes % 60);
                            let viewTimeDisplay = "";
                            if (day > 0) {
                                viewTimeDisplay = `${day}d ${hr}h ${min}m`;
                            } else if (hr > 0) {
                                viewTimeDisplay = `${hr}h ${min}m`;
                            } else {
                                viewTimeDisplay = `${min}m`;
                            }
                            sortMessages[i].viewTimes = viewTimeDisplay;
                        }
                        if (sortMessages.length > 25) {
                            service.kolViewTimes = sortMessages.slice(0, 25);
                        } else {
                            service.kolViewTimes = sortMessages;
                        }
                    });
            };
            service.getKolTopEmotes = (queryTime) => {
                if (queryTime.startTime === null || queryTime.endTime === null) {
                    service.kolEmotes = [];
                    return;
                }
                $q.when(backendCommunicator.fireEventAsync('getTopEmotes', queryTime))
                    .then(emotes => {
                        service.kolEmotes = [];
                        let result = service.groupBy(emotes, doc => doc.emoteItem.name);
                        const keys = result.keys();
                        const values = result.values();
                        let sortMessages = [];
                        for (let i = 0; i < result.size && i <= 24; i++) {
                            let uniqueEmotes = values.next().value;
                            let emotetimes = uniqueEmotes.length;
                            let uniqueUsers = service.groupBy(uniqueEmotes, doc => doc.userId).size;
                            let message = {
                                "rankId": i + 1,
                                "emote": keys.next().value,
                                "uniqueUsers": uniqueUsers,
                                "times": emotetimes,
                                "origin": uniqueEmotes[0].emoteItem.origin,
                                "url": uniqueEmotes[0].emoteItem.url
                            };
                            sortMessages.push(message);
                        }
                        sortMessages = sortMessages.sort(service.descSort("uniqueUsers"));
                        for (let i = 0; i < sortMessages.length && i < 25; i++) {
                            sortMessages[i].rankId = i + 1;
                        }
                        if (sortMessages.length > 25) {
                            service.kolEmotes = sortMessages.slice(0, 25);
                        } else {
                            service.kolEmotes = sortMessages;
                        }
                    });
            };
            function getTopChartFile() {
                return profileManager.getJsonDbInProfile("/data/kolTopChart");
            }
            function getDataFromFile(path) {
                let data = null;
                try {
                    data = getTopChartFile().getData(path);
                } catch (err) {} //eslint-disable-line no-empty
                return data;
            }
            service.getDataFromFile = path => {
                return getDataFromFile(path);
            };
            return service;
        });
}());
