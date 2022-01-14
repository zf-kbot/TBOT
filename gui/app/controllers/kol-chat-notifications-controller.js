"use strict";

(function () {
    angular
        .module("twitcherbotApp")
        .controller("kolChatNotificationsController", function ($scope, $translate, logger, profileManager, gaService, kolHistoryService) {
            gaService.sendEvent('chat notification', 'open');
            $scope.active = 0;
            $scope.tabId = "followers";
            $scope.description = "";
            $scope.messageTip = "";
            $scope.placeholderText = "";
            $scope.emptyContentIdList = [];
            $scope.responseMsgChanged = false;
            $scope.cooldownTimeOptions = [
                { name: '0', value: 0 },
                { name: '5s', value: 5 },
                { name: '10s', value: 10 },
                { name: '20s', value: 20 }
            ];
            $scope.cooldownTime = $scope.cooldownTimeOptions[0].value;
            const randomLength = 4;
            const RESPONSE_STATUS = {
                PENDING: 0,
                SUCCESS: 1,
                OUT_OF_LIMIT: 2,
                EMPTY_CONTENT: 3
            };
            $scope.SUCCESS = RESPONSE_STATUS.SUCCESS;
            $scope.saveStatus = RESPONSE_STATUS.PENDING;

            function getUuiD(randomLength) {
                return Number(Math.random().toString().substr(2, randomLength) + Date.now()).toString(36);
            }

            function getChatNotificationsFile() {
                return profileManager.getJsonDbInProfile("/interactive-tool/chat-notifications");
            }

            function pushDataToFile(path, data) {
                try {
                    getChatNotificationsFile().push(path, data);
                } catch (err) {} //eslint-disable-line no-empty
            }

            function getDataFromFile(path) {
                try {
                    return getChatNotificationsFile().getData(path);
                } catch (err) {
                    return {};
                }
            }

            // 初始化tab的激活状态、预设响应消息
            let initTabInfo = () => {
                let tabInfo = getDataFromFile(`/${$scope.tabId}`);
                if ($.isEmptyObject(tabInfo)) {
                    $scope.isActive = false;
                    $scope.responseMsgs = [
                        {
                            id: getUuiD(randomLength),
                            data: $scope.placeholderText
                        }
                    ];
                    $scope.cooldownTime = $scope.cooldownTimeOptions[0].value;
                } else {
                    $scope.isActive = tabInfo.isActive;
                    $scope.responseMsgs = tabInfo.responseMsgs;
                    if ('cooldownTime' in tabInfo) { // 只有followers存在该key
                        $scope.cooldownTime = tabInfo.cooldownTime;
                    }
                }
            };

            $scope.tabs = ["Followers", "Subscriber", "Gift Subscription", "Cheer", "Host", "Raid", "Annoucement"];
            $scope.tabsTranslations = $translate.instant($scope.tabs.map(v => ("chat notifications.tabs." + v).replace(/ /g, '_').toUpperCase()));
            $scope.toTranslationsTabKey = tab => ('chat notifications.tabs.' + tab).replace(/ /g, '_').toUpperCase();

            // 将变量名添加到输入框
            $scope.selectedInputIdx = -1;
            $scope.appendToInput = (name) => {
                if ($scope.selectedInputIdx !== -1) {
                    angular.element(`#kol-chat-notifications-responseMsgs input`).each((index, item) => {
                        if (index === $scope.selectedInputIdx) {
                            let $item = $(item);
                            let caretPos = item.selectionStart;
                            let val = $item.val();
                            let textToAdd = `{${name}}`;
                            $item.val(val.substring(0, caretPos) + textToAdd + val.substring(caretPos));
                            $item.trigger("change");
                            item.focus();
                            item.selectionStart = caretPos;
                            item.selectionEnd = caretPos + textToAdd.length;
                            return false;
                        }
                    });
                }
            };
            $scope.clickedInput = (idx) => {
                // 实际twitcherbotInput组件内存在2个input，故需跳过
                $scope.selectedInputIdx = idx * 2;
            };
            const tabInfoMapper = {
                followers: {
                    id: 'followers',
                    description: $translate.instant("CHAT_NOTIFICATIONS.ACTIVE_DESC.FOLLOWERS"),
                    commonText: $translate.instant("CHAT_NOTIFICATIONS.AVAILABLE_ARGUEMENT") + ': ',
                    arguments: ["username"],
                    placeholderText: 'Thanks for your following @{username}!'
                },
                subscriber: {
                    id: 'subscriber',
                    description: $translate.instant("CHAT_NOTIFICATIONS.ACTIVE_DESC.SUBSCRIBER"),
                    commonText: $translate.instant("CHAT_NOTIFICATIONS.AVAILABLE_ARGUEMENT") + ': ',
                    arguments: ["username"],
                    placeholderText: 'Thank you for @{username} new subscribing!'
                },
                giftSubscription: {
                    id: 'giftSubscription',
                    description: $translate.instant("CHAT_NOTIFICATIONS.ACTIVE_DESC.GIFT_SUBSCRIPTION"),
                    commonText: $translate.instant("CHAT_NOTIFICATIONS.AVAILABLE_ARGUEMENT") + ': ',
                    arguments: ["username", "amount"],
                    placeholderText: '@{username} was gifted {amount} subscription! Thanks!'
                },
                cheer: {
                    id: 'cheer',
                    description: $translate.instant("CHAT_NOTIFICATIONS.ACTIVE_DESC.CHEER"),
                    commonText: $translate.instant("CHAT_NOTIFICATIONS.AVAILABLE_ARGUEMENT") + ': ',
                    arguments: ["username", "amount"],
                    placeholderText: '@{username} just cheered {amount} bits! Thanks!'
                },
                host: {
                    id: 'host',
                    description: $translate.instant("CHAT_NOTIFICATIONS.ACTIVE_DESC.HOST"),
                    commonText: $translate.instant("CHAT_NOTIFICATIONS.AVAILABLE_ARGUEMENT") + ': ',
                    arguments: ["username", "amount"],
                    placeholderText: '@{username} is hosting for {amount} viewers!'
                },
                raid: {
                    id: 'raid',
                    description: $translate.instant("CHAT_NOTIFICATIONS.ACTIVE_DESC.RAID"),
                    commonText: $translate.instant("CHAT_NOTIFICATIONS.AVAILABLE_ARGUEMENT") + ': ',
                    arguments: ["username", "amount"],
                    placeholderText: '@{username} is raiding this channel for {amount} viewers!'
                },
                annoucement: {
                    id: 'annoucement',
                    description: $translate.instant("CHAT_NOTIFICATIONS.ACTIVE_DESC.ANNOUCEMENT"),
                    commonText: $translate.instant("CHAT_NOTIFICATIONS.AVAILABLE_ARGUEMENT") + ': ',
                    arguments: ["streamername", "game", "title"],
                    placeholderText: '@{streamername} is now live! Streaming {game}: {title}'
                }
            };

            $scope.changeTab = (tabName) => {
                // 空格转驼峰
                tabName = tabName.toLowerCase().replace(/ (\w)/g, (all, letter) => letter.toUpperCase());
                $scope.tabId = tabInfoMapper[tabName].id;
                $scope.description = tabInfoMapper[tabName].description;
                $scope.commonText = tabInfoMapper[tabName].commonText;
                $scope.arguments = tabInfoMapper[tabName].arguments;
                $scope.placeholderText = tabInfoMapper[tabName].placeholderText;
                $scope.saveStatus = RESPONSE_STATUS.PENDING;
                $scope.emptyContentIdList = [];
                $scope.responseMsgChanged = false;
                initTabInfo();
                gaService.sendEvent("chat notification", "change", tabName);
            };

            $scope.toggleActive = () => {
                $scope.isActive = !$scope.isActive;
                gaService.sendEvent("chat notification", "active", $scope.tabId, $scope.isActive === true ? 1 : 0);
                if ($scope.tabId === 'followers') {
                    pushDataToFile(`/${$scope.tabId}`, {
                        isActive: $scope.isActive,
                        responseMsgs: $scope.responseMsgs,
                        cooldownTime: $scope.cooldownTime
                    });
                } else {
                    pushDataToFile(`/${$scope.tabId}`, {
                        isActive: $scope.isActive,
                        responseMsgs: $scope.responseMsgs
                    });
                }
                kolHistoryService.pushHistoryMsg(`${$scope.isActive ? 'Activated' : 'Deactivated'} the ${$scope.tabId} of chat notifications`);
            };

            $scope.addNewResponseMsg = () => {
                $scope.responseMsgChanged = true;
                $scope.responseMsgs.push({
                    id: getUuiD(randomLength),
                    data: ""
                });
                gaService.sendEvent("chat notification", "new", $scope.tabId);
            };

            $scope.deleteResponseMsgByIndex = (index) => {
                $scope.responseMsgChanged = true;
                $scope.responseMsgs.splice(index, 1);
                gaService.sendEvent("chat notification", "delete", $scope.tabId);
            };

            $scope.onChangedInput = () => {
                $scope.responseMsgChanged = true;
            };

            $scope.save = () => {
                $scope.saveStatus = RESPONSE_STATUS.PENDING;
                $scope.emptyContentIdList = [];
                /**
                if ($scope.responseMsgs.length > 5) {
                    $scope.saveStatus = RESPONSE_STATUS.OUT_OF_LIMIT;
                    return;
                }
                */
                $scope.responseMsgs.forEach(element => {
                    if (element.data.trim().length === 0) {
                        // 空内容
                        $scope.saveStatus = RESPONSE_STATUS.EMPTY_CONTENT;
                        $scope.emptyContentIdList.push(element.id);
                    }
                });
                if ($scope.saveStatus === RESPONSE_STATUS.EMPTY_CONTENT) {
                    return;
                }
                if ($scope.tabId === 'followers') {
                    pushDataToFile(`/${$scope.tabId}`, {
                        isActive: $scope.isActive,
                        responseMsgs: $scope.responseMsgs,
                        cooldownTime: $scope.cooldownTime
                    });
                } else {
                    pushDataToFile(`/${$scope.tabId}`, {
                        isActive: $scope.isActive,
                        responseMsgs: $scope.responseMsgs
                    });
                }
                $scope.saveStatus = RESPONSE_STATUS.SUCCESS;
                kolHistoryService.pushHistoryMsg(`Edited the ${$scope.tabId} of chat notifications`);
                setTimeout(() => {
                    $scope.saveStatus = RESPONSE_STATUS.PENDING;
                }, 2000);
            };
        });
}());
