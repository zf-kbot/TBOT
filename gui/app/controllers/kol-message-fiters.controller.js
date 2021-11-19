"use strict";
(function() {
    //This handles the Moderation tab

    const fs = require("fs");

    angular
        .module("twitcherbotApp")
        .controller("kolMessageFilterController", function($scope, eventLogService, chatModerationService, utilityService,
            viewerRolesService, settingsService, gaService, kolHistoryService, backendCommunicator) {
            gaService.sendEvent('message_filter', 'open');

            $scope.activeTab = 0;

            $scope.eventLogService = eventLogService;

            $scope.settingsService = settingsService;

            $scope.pagination = {
                generalLog: {
                    currentPage: 1,
                    pageSize: 5
                },
                alertLog: {
                    currentPage: 1,
                    pageSize: 5
                }
            };

            $scope.getExemptRoles = () => {
                return [
                    ...viewerRolesService.getTwitchRoles(),
                    ...viewerRolesService.getCustomRoles(),
                    ...viewerRolesService.getTeamRoles()
                ].filter(r => chatModerationService.chatModerationData.settings.exemptRoles.includes(r.id));
            };

            $scope.openAddExemptRoleModal = () => {

                const options =
                    [
                        ...viewerRolesService.getTwitchRoles(),
                        ...viewerRolesService.getCustomRoles(),
                        ...viewerRolesService.getTeamRoles()
                    ]
                        .filter(r =>
                            !chatModerationService.chatModerationData.settings.exemptRoles.includes(r.id))
                        .map(r => ({
                            id: r.id,
                            name: r.name
                        }));
                utilityService.openSelectModal(
                    {
                        label: "Add Exempt Role",
                        options: options,
                        saveText: "Add",
                        validationText: "Please select a role."

                    },
                    (roleId) => {
                        if (!roleId) return;
                        chatModerationService.chatModerationData.settings.exemptRoles.push(roleId);
                        chatModerationService.saveChatModerationSettings();
                    });
            };

            $scope.removeExemptRole = (roleId) => {
                chatModerationService.chatModerationData.settings.exemptRoles =
                        chatModerationService.chatModerationData.settings.exemptRoles.filter(id => id !== roleId);
                chatModerationService.saveChatModerationSettings();
            };

            $scope.cms = chatModerationService;

            $scope.toggleUrlModerationFeature = () => {
                if (!chatModerationService.chatModerationData.settings.urlModeration.enabled) {
                    chatModerationService.chatModerationData.settings.urlModeration.enabled = true;
                    chatModerationService.registerPermitCommand();
                } else {
                    chatModerationService.chatModerationData.settings.urlModeration.enabled = false;
                    chatModerationService.unregisterPermitCommand();
                }

                chatModerationService.saveChatModerationSettings();
            };

            $scope.showEditBannedWordsModal = () => {
                utilityService.showModal({
                    component: "editBannedWordsModal",
                    backdrop: true,
                    resolveObj: {}
                });
            };
            //记录messageFilter按钮开关变化
            $scope.saveChatModerationSettings = (type) => {
                gaService.sendEvent('message_filter', 'change', type);
                $scope.cms.saveChatModerationSettings();
                switch (type) {
                case "repetitions":
                    kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type},from ${$scope.cms.chatModerationData.settings.repetitions.enabled ? "closed" : "open"} to ${$scope.cms.chatModerationData.settings.repetitions.enabled ? "open" : "closed"}`);
                    break;
                case "emotes":
                    kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type},from ${$scope.cms.chatModerationData.settings.emoteLimit.enabled ? "closed" : "open"} to ${$scope.cms.chatModerationData.settings.emoteLimit.enabled ? "open" : "closed"}`);
                    break;
                case "excess caps":
                    kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type},from ${$scope.cms.chatModerationData.settings.excessCaps.enabled ? "closed" : "open"} to ${$scope.cms.chatModerationData.settings.excessCaps.enabled ? "open" : "closed"}`);
                    break;
                case 'symbols':
                    kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type},from ${$scope.cms.chatModerationData.settings.symbols.enabled ? "closed" : "open"} to ${$scope.cms.chatModerationData.settings.symbols.enabled ? "open" : "closed"}`);
                    break;
                default: break;
                }
            };
            //记录messageFilter输入框输入变化
            $scope.saveInputChatModerationSettings = (type) => {
                gaService.sendEvent('message_filter', 'change', type);
                let oldData = backendCommunicator.fireEventSync("getChatModerationData");
                $scope.cms.saveChatModerationSettings();
                switch (type) {
                case "repetitions":
                    if (oldData.settings.repetitions.max !== $scope.cms.chatModerationData.settings.repetitions.max) {
                        kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type}.Max Per Message from ${oldData.settings.repetitions.max} to ${$scope.cms.chatModerationData.settings.repetitions.max}.`);
                    }
                    break;
                case "emotes":
                    if (oldData.settings.emoteLimit.max !== $scope.cms.chatModerationData.settings.emoteLimit.max) {
                        kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type}.Max Per Message from ${oldData.settings.emoteLimit.max} to ${$scope.cms.chatModerationData.settings.emoteLimit.max}.`);
                    }
                    break;
                case "excess caps":
                    if (oldData.settings.excessCaps.max !== $scope.cms.chatModerationData.settings.excessCaps.max) {
                        kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type}.Max Per Message from ${oldData.settings.excessCaps.max} to ${$scope.cms.chatModerationData.settings.excessCaps.max}.`);
                    }
                    break;
                case 'symbols':
                    if (oldData.settings.symbols.max !== $scope.cms.chatModerationData.settings.symbols.max) {
                        kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type}.Max Per Message from ${oldData.settings.symbols.max} to ${$scope.cms.chatModerationData.settings.symbols.max}.`);
                    }
                    break;
                default: break;
                }
                // kolHistoryService.pushHistoryMsg(`Changed message filter, type: ${type}`);
            };
        });
}());
