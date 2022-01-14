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
            $translate
        ) {
            gaService.sendEvent('blacklisted_words', 'open');
            // Cache commands on app load.
            commandsService.refreshCommands();

            $scope.activeCmdTab = 0;

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
            function filterCommands() {
                return triggerSearchFilter(sortTagSearchFilter(commandsService.getCustomCommands(), sortTagsService.getSelectedSortTag("commands")), commandsService.customCommandSearch);
            }

            $scope.filteredCommands = filterCommands();

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

            $scope.manuallyTriggerCommand = id => {
                listenerService.fireEvent(
                    listenerService.EventType.COMMAND_MANUAL_TRIGGER,
                    id
                );
            };

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

            $scope.duplicateCustomCommand = command => {
                let copiedCommand = objectCopyHelper.copyObject("command", command);

                while (commandsService.triggerExists(copiedCommand.trigger)) {
                    copiedCommand.trigger += "copy";
                }

                commandsService.saveCustomCommand(copiedCommand);
                commandsService.refreshCommands();
            };

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
            $scope.innerChangeCommandActive = function(command) {
                commandsService.saveCustomCommand(command);
                commandsService.refreshCommands();
            };
            $scope.changeCommandActive = function(command) {
                command.active = !command.active;
                if (command.active) {
                    kolHistoryService.pushHistoryMsg(`Began a blacklisted words: ${command.trigger}`);
                } else {
                    kolHistoryService.pushHistoryMsg(`Ended a blacklisted words: ${command.trigger}`);
                }
                $scope.innerChangeCommandActive(command);
            };

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
