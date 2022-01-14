"use strict";
(function() {

    angular
        .module("twitcherbotApp")
        .controller("popChatMessagesController", function(
            $scope,
            $rootScope,
            chatMessagesService,
            connectionService,
            settingsService,
            utilityService,
            backendCommunicator,
            kolHistoryService,
            gaService,
            logger,
        ) {
            $scope.settings = settingsService;
            $scope.chatMessage = "";
            $scope.chatSender = "Streamer";
            $scope.disabledMessage = "DASHBOARD.CHATFEED.DISABLEDMESSAGE";
            $scope.cms = chatMessagesService;
            $scope.khs = kolHistoryService;

            $scope.selectedUserData = {};

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
                    component: "kolPopChatSettingsModal",
                    size: "sm",
                    windowClass: "margin-auto",
                    backdrop: true,
                    dismissCallback: getUpdatedChatSettings,
                    closeCallback: getUpdatedChatSettings
                });
            };

            $scope.showKolChatEmotesModal = () => {
                utilityService.showModal({
                    component: "kolPopChatEmotesModal",
                    resolveObj: {
                        chatMessage: () => $scope.chatMessage
                    },
                    size: "sm",
                    backdrop: true,
                    windowClass: "modal-emotesize modal-popout-box",
                    dismissCallback: getUpdatedChatSettings,
                    closeCallback: getUpdatedChatSettings
                });
                gaService.sendEvent('dashboard', 'open', 'chat emotes');
            };

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
            function focusMessageInput() {
                angular.element("#chatMessageInput").trigger("focus");
            }
            $scope.updateChatInput = function(text) {
                $scope.chatMessage = text;
                focusMessageInput();
            };
            $rootScope.$on("clickEmoji", (event, data) => {
                let text = $scope.chatMessage + ' ' + data.code + ' ';
                $scope.updateChatInput(text);
            });

            $scope.chatFeedIsEnabled = true;
            backendCommunicator.on("sync-ipc-chat-connected-status", (status) => {
                $scope.chatFeedIsEnabled = status;
            });

            backendCommunicator.on("sync-ipc-chat-queue", () => {
                chatMessagesService.popoutGetChatMsg();
            });

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

            chatMessagesService.popoutGetChatMsg();
        });
}());
