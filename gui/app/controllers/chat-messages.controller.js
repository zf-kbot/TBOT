"use strict";
(function() {

    angular
        .module("twitcherbotApp")
        .controller("chatMessagesController", function(
            $scope,
            chatMessagesService,
            connectionService,
            settingsService,
            utilityService,
            activityFeedService,
            backendCommunicator,
            kolHistoryService,
            gaService,
            logger,
            $rootScope,
            $translate
        ) {
            gaService.sendEvent('dashboard', 'open');
            $scope.settings = settingsService;

            $scope.afs = activityFeedService;
            $scope.MARK_ALL_AS = $translate.instant("DASHBOARD.ACTIVITY_FEED.SETTING.MARK_ALL_AS");
            $scope.UNACKNOWLEDGED_EVENTS = $translate.instant("DASHBOARD.ACTIVITY_FEED.HOVER.UNACKNOWLEDGED_EVENTS");
            $scope.ACKNOWLEDGED_OR_UNACKNOWLEDGED = $scope.afs.allAcknowledged() ? $translate.instant("DASHBOARD.ACTIVITY_FEED.SETTING.UNACKNOWLEDGED") : $translate.instant("DASHBOARD.ACTIVITY_FEED.SETTING.ACKNOWLEDGED");

            $scope.chatMessage = "";
            $scope.chatSender = "Streamer";
            $scope.disabledMessage = "";

            $scope.chatBoxIsPopped = false;
            $scope.popChatBox = () => {
                $scope.chatBoxIsPopped = true;
                backendCommunicator.send("pop-chat-box");
            };
            backendCommunicator.on("closePopChatBox", () => {
                $scope.chatBoxIsPopped = false;
            });

            $scope.cms = chatMessagesService;
            $scope.khs = kolHistoryService;

            $scope.selectedUserData = {};

            $scope.botLoggedIn = connectionService.accounts.bot.loggedIn;

            // the number of messages to show visually, we have to make the number negative so angular knows to limit
            // from the end of the array instead of the front
            $scope.messageDisplayLimit = chatMessagesService.chatMessageDisplayLimit * -1;

            $scope.oldChatSetting = {};
            function getUpdatedChatSettings(init) {
                $scope.isChanged = false;
                $scope.oldChatSetting.compactDisplay = $scope.compactDisplay;
                $scope.oldChatSetting.alternateBackgrounds = $scope.alternateBackgrounds;
                $scope.oldChatSetting.hideDeletedMessages = $scope.hideDeletedMessages;
                $scope.oldChatSetting.showAvatars = $scope.showAvatars;
                $scope.oldChatSetting.showTimestamps = $scope.showTimestamps;
                $scope.oldChatSetting.showThirdPartyEmotes = $scope.showThirdPartyEmotes;
                $scope.oldChatSetting.showPronouns = $scope.showPronouns;
                $scope.oldChatSetting.customFontSizeEnabled = $scope.customFontSizeEnabled;
                $scope.oldChatSetting.customFontSize = $scope.customFontSize;
                $scope.oldChatSetting.customFontSizeStyle = $scope.customFontSizeStyle;

                $scope.compactDisplay = settingsService.isChatCompactMode();
                $scope.alternateBackgrounds = settingsService.chatAlternateBackgrounds();
                $scope.hideDeletedMessages = settingsService.chatHideDeletedMessages();
                $scope.showAvatars = settingsService.getShowAvatars();
                $scope.showTimestamps = settingsService.getShowTimestamps();
                $scope.showThirdPartyEmotes = settingsService.getShowThirdPartyEmotes();
                $scope.showPronouns = settingsService.getShowPronouns();
                $scope.customFontSizeEnabled = settingsService.getChatCustomFontSizeEnabled();
                $scope.customFontSize = settingsService.getChatCustomFontSize();
                $scope.customFontSizeStyle = $scope.customFontSizeEnabled ?
                    `font-size: ${$scope.customFontSize}px !important;` : "";

                Object.keys($scope.oldChatSetting).some(key => {
                    $scope.isChanged = $scope.oldChatSetting[key] !== $scope[key];
                    return $scope.isChanged;
                });
                if (init !== 1 && $scope.isChanged) {
                    gaService.sendEvent('dashboard', 'change', 'chat setting');
                    kolHistoryService.pushHistoryMsg('Changed chat setting');
                }
            }
            getUpdatedChatSettings(1);

            function focusMessageInput() {
                angular.element("#chatMessageInput").trigger("focus");
            }

            $scope.showUserDetailsModal = (userId) => {
                if (userId == null) return;
                let closeFunc = () => {};
                utilityService.showModal({
                    component: "viewerDetailsModal",
                    backdrop: true,
                    resolveObj: {
                        userId: () => userId
                    },
                    closeCallback: closeFunc,
                    dismissCallback: closeFunc
                });
            };

            $scope.showChatSettingsModal = () => {
                utilityService.showModal({
                    component: "chatSettingsModal",
                    size: "sm",
                    backdrop: true,
                    dismissCallback: getUpdatedChatSettings,
                    closeCallback: getUpdatedChatSettings
                });
            };

            $scope.showKolChatEmotesModal = () => {
                utilityService.showModal({
                    component: "kolChatEmotesModal",
                    resolveObj: {
                        chatMessage: () => $scope.chatMessage
                    },
                    size: "sm",
                    backdrop: true,
                    windowClass: "modal-emotesize",
                    dismissCallback: getUpdatedChatSettings,
                    closeCallback: getUpdatedChatSettings
                });
                gaService.sendEvent('dashboard', 'open', 'chat emotes');
            };
            //监听点击表情图标事件，将表情code自动加入输入框
            $rootScope.$on("clickEmoji", (event, data) => {
                $scope.updateChatInput($scope.chatMessage + ' ' + data.code + ' ');
            });

            $scope.showEditStreamInfoModal = () => {
                utilityService.showModal({
                    component: "editStreamInfoModal",
                    size: "md"
                });
            };

            $scope.showGiveCurrencyModal = () => {
                utilityService.showModal({
                    component: "giveCurrencyModal",
                    size: "md"
                });
            };

            $scope.updateChatInput = function(text) {
                $scope.chatMessage = text;
                focusMessageInput();
            };

            $scope.popoutStreamPreview = () => {
                // const modal = window.open('', 'stream-preview');
                // modal.document.head.insertAdjacentHTML("beforeend", `
                //     <style>
                //         body {
                //             -webkit-app-region: drag;
                //         }
                //         button, a {
                //             -webkit-app-region: no-drag;
                //         }
                //     </style>
                // `);
                // modal.document.title = `Stream Preview`;
                backendCommunicator.send("show-twitch-preview");
            };

            $scope.oldConnectionStatus = connectionService.connections['chat'];
            $scope.chatFeedIsEnabled = function() {
                if (connectionService.connections['chat'] !== 'connected') {
                    $scope.disabledMessage = "DASHBOARD.CHATFEED.DISABLEDMESSAGE";
                }
                let isEnabled = connectionService.connections['chat'] === 'connected';
                if (connectionService.connections['chat'] !== $scope.oldConnectionStatus) {
                    $scope.oldConnectionStatus = connectionService.connections['chat'];
                    backendCommunicator.send("sync-ipc-chat-connected-status", isEnabled);
                }
                return isEnabled;
            };

            $scope.getChatViewerListSetting = function() {
                return chatMessagesService.getChatViewerListSetting();
            };

            $scope.getActivityFeedSetting = function() {
                return chatMessagesService.getActivityFeedSetting();
            };

            $scope.getHistorySetting = function() {
                return chatMessagesService.getHistorySetting();
            };

            $scope.getStreamInfoSetting = function() {
                return chatMessagesService.getStreamInfoSetting();
            };


            // This happens when a chat message is submitted.
            let chatHistory = [];
            let currrentHistoryIndex = -1;
            $scope.submitChat = function() {
                if ($scope.chatMessage == null || $scope.chatMessage.length < 1) {
                    return;
                }
                chatMessagesService.submitChat($scope.chatSender, $scope.chatMessage);
                chatHistory.unshift($scope.chatMessage);
                currrentHistoryIndex = -1;
                $scope.chatMessage = "";
            };

            $scope.onMessageFieldUpdate = () => {
                currrentHistoryIndex = -1;
            };

            $scope.onMessageFieldKeypress = $event => {
                let keyCode = $event.which || $event.keyCode;
                if (keyCode === 38) {
                    //up arrow
                    if (
                        $scope.chatMessage.length < 1 ||
            $scope.chatMessage === chatHistory[currrentHistoryIndex]
                    ) {
                        if (currrentHistoryIndex + 1 < chatHistory.length) {
                            currrentHistoryIndex++;
                            $scope.chatMessage = chatHistory[currrentHistoryIndex];
                        }
                    }
                } else if (keyCode === 40) {
                    //down arrow
                    if (
                        $scope.chatMessage.length > 0 ||
            $scope.chatMessage === chatHistory[currrentHistoryIndex]
                    ) {
                        if (currrentHistoryIndex - 1 >= 0) {
                            currrentHistoryIndex--;
                            $scope.chatMessage = chatHistory[currrentHistoryIndex];
                        }
                    }
                } else if (keyCode === 13) {
                    // enter
                    $scope.submitChat();
                }
            };

            $scope.refreshStreamInfo = () => {
                $rootScope.$broadcast("refreshStreamInfo");
            };
        });
}());
