"use strict";
(function() {
    angular
        .module("twitcherbotApp")
        .controller("kolBlacklistedWordsController", function(
            $scope,
            triggerSearchFilter,
            sortTagSearchFilter,
            commandsService,
            utilityService,
            listenerService,
            viewerRolesService,
            objectCopyHelper,
            sortTagsService,
            gaService,
            kolHistoryService,
            logger,
            $translate,
            chatModerationService
        ) {
            gaService.sendEvent('blacklisted_words', 'open');
            // Cache commands on app load.
            commandsService.refreshCommands();

            $scope.activeCmdTab = 0;
            $scope.cms = chatModerationService;
            $scope.candidateExemptRoles = [
                "BLACKLISTEDWORDS.SETTING.EXEMPT_USER_GROUP_ROLE.OWNER",
                "BLACKLISTEDWORDS.SETTING.EXEMPT_USER_GROUP_ROLE.MOD",
                "BLACKLISTEDWORDS.SETTING.EXEMPT_USER_GROUP_ROLE.VIP",
                "BLACKLISTEDWORDS.SETTING.EXEMPT_USER_GROUP_ROLE.SUBSCRIBER"
            ];
            //转义豁免角色的下拉框列表
            $scope.translationCandidateExemptRoles = [];
            for (let i = 0; i < $scope.candidateExemptRoles.length; i++) {
                $translate($scope.candidateExemptRoles[i]).then((res) => {
                    $scope.translationCandidateExemptRoles[i] = res;
                });
            }
            $scope.useDefaultBlacklistTip = "";
            $translate(`BLACKLISTEDWORDS.SETTING.USE_DEFAULT_BLACKLIST_TOOLTIP`).then((ret) => {
                $scope.useDefaultBlacklistTip = ret;
            });
            $scope.exemptUserGroup = "";
            $translate(`BLACKLISTEDWORDS.SETTING.EXEMPT_USER_GROUP_TOOLTIP`).then((ret) => {
                $scope.exemptUserGroup = ret;
            });
            //获取配置中的豁免角色
            if ($scope.cms.chatModerationData.settings.exemptRoles.length <= 1) {
                $scope.roleSelected = $translate($scope.candidateExemptRoles[0]).then((res) => {
                    $scope.roleSelected = res;
                });
            } else {
                $scope.roleSelected = $translate($scope.candidateExemptRoles[$scope.cms.chatModerationData.settings.exemptRoles.length - 1]).then((res) => {
                    $scope.roleSelected = res;
                });
            }

            $scope.commandsService = commandsService;
            $scope.sts = sortTagsService;
            $scope.translations = {
                "BLACKLISTEDWORDS.CONFIRMMODAL.TITLE": "",
                "BLACKLISTEDWORDS.CONFIRMMODAL.QUESTION": "",
                "BLACKLISTEDWORDS.CONFIRMMODAL.CONFIRMlABEL_DELETE": "",
                "BLACKLISTEDWORDS.CONFIRMMODAL.CONFIRMlABEL_CANCEL": ""
            };
            const translationRes = $translate.instant(Object.keys($scope.translations));
            for (let key in translationRes) {
                if ({}.hasOwnProperty.call($scope.translations, key)) {
                    $scope.translations[key] = translationRes[key];
                }
            }
            //待整理
            function filterCommands() {
                return triggerSearchFilter(sortTagSearchFilter(commandsService.getCustomCommands(), sortTagsService.getSelectedSortTag("commands")), commandsService.customCommandSearch);
            }
            //改变default 黑名单词汇状态并存储
            $scope.changeDefaultBlacklistedWordsStatus = () => {
                //点击按钮后，更改按钮对应属性值
                $scope.cms.chatModerationData.settings.bannedWordList.enabled = !$scope.cms.chatModerationData.settings.bannedWordList.enabled;
                $scope.cms.saveChatModerationSettings();
                gaService.sendEvent('blacklisted_words', 'active', 'use_default_blacklist');
            };
            //设置黑名单词汇豁免角色
            $scope.selectExemptRolesOption = (exemptRole) => {
                $scope.roleSelected = exemptRole;
                //取选中元素在translationCandidateExemptRoles 中的下标
                switch ($scope.translationCandidateExemptRoles.indexOf(exemptRole)) {
                case 0: $scope.cms.chatModerationData.settings.exemptRoles = ["broadcaster"]; break;
                case 1: $scope.cms.chatModerationData.settings.exemptRoles = ["broadcaster", "mod"]; break;
                case 2: $scope.cms.chatModerationData.settings.exemptRoles = ["broadcaster", "mod", "vip"]; break;
                case 3: $scope.cms.chatModerationData.settings.exemptRoles = ["broadcaster", "mod", "vip", "sub"];
                }
                $scope.cms.saveChatModerationSettings();
                gaService.sendEvent('blacklisted_words', 'click', 'exempt_user_group');
            };
            $scope.filteredCommands = filterCommands();
            //待整理
            $scope.getPermissionType = command => {

                let permissions = command.restrictionData && command.restrictionData.restrictions &&
                    command.restrictionData.restrictions.find(r => r.type === "twitcherbot:permissions");

                if (permissions) {
                    if (permissions.mode === "roles") {
                        return "Roles";
                    } else if (permissions.mode === "viewer") {
                        return "Viewer";
                    }
                } else {
                    return "None";
                }
            };
            //待整理
            $scope.getPermissionTooltip = command => {

                let permissions = command.restrictionData && command.restrictionData.restrictions &&
                    command.restrictionData.restrictions.find(r => r.type === "twitcherbot:permissions");

                if (permissions) {
                    if (permissions.mode === "roles") {
                        let roleIds = permissions.roleIds;
                        let output = "None selected";
                        if (roleIds.length > 0) {
                            output = roleIds
                                .filter(id => viewerRolesService.getRoleById(id) != null)
                                .map(id => viewerRolesService.getRoleById(id).name)
                                .join(", ");
                        }
                        return `Roles (${output})`;
                    } else if (permissions.mode === "viewer") {
                        return `Viewer (${permissions.username ? permissions.username : 'No name'})`;
                    }
                } else {
                    return "This command is available to everyone";
                }
            };
            //待整理
            $scope.manuallyTriggerCommand = id => {
                listenerService.fireEvent(
                    listenerService.EventType.COMMAND_MANUAL_TRIGGER,
                    id
                );
            };
            //修改自定义的黑名单词汇状态
            $scope.toggleCustomCommandActiveState = command => {
                if (command == null) return;
                command.active = !command.active;
                commandsService.saveCustomCommand(command);
                commandsService.refreshCommands();
            };

            $scope.toggleSortTag = (command, tagId) => {
                if (command == null) return;
                if (command.sortTags == null) {
                    command.sortTags = [];
                }
                if (command.sortTags.includes(tagId)) {
                    command.sortTags = command.sortTags.filter(id => id !== tagId);
                } else {
                    command.sortTags.push(tagId);
                }
                commandsService.saveCustomCommand(command);
                commandsService.refreshCommands();
            };

            $scope.deleteCustomCommand = command => {
                utilityService.showConfirmationModal({
                    title: $scope.translations['BLACKLISTEDWORDS.CONFIRMMODAL.TITLE'],
                    question: $scope.translations['BLACKLISTEDWORDS.CONFIRMMODAL.QUESTION'] + command.trigger + ' ?',
                    confirmLabel: $scope.translations['BLACKLISTEDWORDS.CONFIRMMODAL.CONFIRMlABEL_DELETE'],
                    cancelLabel: $scope.translations['BLACKLISTEDWORDS.CONFIRMMODAL.CONFIRMlABEL_CANCEL'],
                    confirmBtnType: "btn-danger"
                }).then(confirmed => {
                    if (confirmed) {
                        commandsService.deleteCustomCommand(command);
                        commandsService.refreshCommands();
                        kolHistoryService.pushHistoryMsg(`Deleted a blacklisted words: ${command.trigger}`);
                    }
                });
            };
            //复制自定义的黑名单词汇(未使用)
            $scope.duplicateCustomCommand = command => {
                let copiedCommand = objectCopyHelper.copyObject("command", command);

                while (commandsService.triggerExists(copiedCommand.trigger)) {
                    copiedCommand.trigger += "copy";
                }

                commandsService.saveCustomCommand(copiedCommand);
                commandsService.refreshCommands();
            };
            //新建或编辑自定义的黑名单词汇命令
            $scope.openAddOrEditCustomCommandModal = function(command) {

                utilityService.showModal({
                    component: "kolAddOrEditCustomCommandModal",
                    resolveObj: {
                        command: () => command
                    },
                    closeCallback: resp => {
                        let action = resp.action,
                            command = resp.command;

                        switch (action) {
                        case "add":
                            gaService.sendEvent('blacklisted_words', 'new');
                            // command.effects.list[0].time = command.effects.list[0].time.toString();
                            logger.debug(command);
                            commandsService.saveCustomCommand(command);
                            logger.debug('command');
                            logger.debug(command);
                            kolHistoryService.pushHistoryMsg(`Added a blacklisted words: ${command.trigger}`);
                            break;
                        case "update":
                            // command.effects.list[0].time = command.effects.list[0].time.toString();
                            commandsService.saveCustomCommand(command);
                            kolHistoryService.pushHistoryMsg(`Updated a blacklisted words: ${command.trigger}`);
                            break;
                        case "delete":
                            commandsService.deleteCustomCommand(command);
                            break;
                        }

                        // Refresh Commands
                        commandsService.refreshCommands();
                    }
                });
            };
            //添加计时器
            // $scope.CountDown = function() {
            //     if (maxtime >= 0) {
            //     minutes = Math.floor(maxtime / 60);
            //     seconds = Math.floor(maxtime % 60);
            //     msg = "距离结束还有" + minutes + "分" + seconds + "秒";
            //     document.all["timer"].innerHTML = msg;
            //     if (maxtime == 5 * 60)alert("还剩5分钟");
            //         --maxtime;
            //     } else{
            //     clearInterval(timer);
            //     alert("时间到，结束!");
            //     }
            // };
            //上面也是添加计时器
            //待整理
            $scope.innerChangeCommandActive = function(command) {
                commandsService.saveCustomCommand(command);
                commandsService.refreshCommands();
            };
            //用户自定义的黑名单词汇状态开关切换
            $scope.changeCommandActive = function(command) {
                command.active = !command.active;
                if (command.active) {
                    kolHistoryService.pushHistoryMsg(`Began a blacklisted words: ${command.trigger}`);
                } else {
                    kolHistoryService.pushHistoryMsg(`Ended a blacklisted words: ${command.trigger}`);
                }
                $scope.innerChangeCommandActive(command);
            };
            //待整理
            $scope.sortableOptions = {
                handle: ".dragHandle",
                'ui-preserve-size': true,
                stop: (e, ui) => {
                    console.log(e, ui);
                    if (sortTagsService.getSelectedSortTag("commands") != null &&
                        (commandsService.customCommandSearch == null ||
                            commandsService.customCommandSearch.length < 1)) return;
                    commandsService.saveAllCustomCommands(commandsService.commandsCache.customCommands);
                }
            };
            //待整理
            $scope.commandMenuOptions = (command) => {
                const options = [
                    {
                        html: `<a href ><i class="fa fa-pencil" style="margin-right: 10px;"></i> Edit</a>`,
                        click: function ($itemScope) {
                            let command = $itemScope.command;
                            $scope.openAddOrEditCustomCommandModal(command);
                        }
                    },
                    {
                        html: `<a href ><i class="far fa-toggle-off" style="margin-right: 10px;"></i> Toggle Enabled</a>`,
                        click: function ($itemScope) {
                            let command = $itemScope.command;
                            $scope.toggleCustomCommandActiveState(command);
                        }
                    },
                    {
                        html: `<a href ><i class="far fa-clone" style="margin-right: 10px;"></i> Duplicate</a>`,
                        click: function ($itemScope) {
                            let command = $itemScope.command;
                            $scope.duplicateCustomCommand(command);
                        }
                    },
                    {
                        html: `<a href style="color: #fb7373;"><i class="fa fa-trash" style="margin-right: 10px;"></i> Delete</a>`,
                        click: function ($itemScope) {
                            let command = $itemScope.command;
                            $scope.deleteCustomCommand(command);
                        }
                    }
                ];

                const sortTags = sortTagsService.getSortTags("commands");

                if (sortTags.length > 0) {
                    options.push({
                        text: "Sort tags...",
                        children: sortTags.map(st => {
                            const isSelected = command.sortTags && command.sortTags.includes(st.id);
                            return {
                                html: `<a href><i class="${isSelected ? 'fas fa-check' : ''}" style="margin-right: ${isSelected ? '10' : '27'}px;"></i> ${st.name}</a>`,
                                click: () => {
                                    $scope.toggleSortTag(command, st.id);
                                }
                            };
                        }),
                        hasTopDivider: true
                    });
                }

                return options;
            };
        });
}());
