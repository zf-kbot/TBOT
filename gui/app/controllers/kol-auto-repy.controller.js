"use strict";
(function() {
    angular
        .module("twitcherbotApp")
        .controller("kolAutoReplyController", function(
            $scope,
            triggerSearchFilter,
            sortTagSearchFilter,
            commandsServiceAutoReply,
            utilityService,
            listenerService,
            viewerRolesService,
            objectCopyHelper,
            sortTagsService,
            gaService,
            kolHistoryService,
            $translate
        ) {
            gaService.sendEvent('auto_reply', 'open');
            // Cache commands on app load.
            commandsServiceAutoReply.refreshCommands();

            $scope.activeCmdTab = 0;

            $scope.commandsServiceAutoReply = commandsServiceAutoReply;
            $scope.sts = sortTagsService;
            $scope.translations = {
                "AUTOREPLY.CONFIRMMODAL.TITLE": "",
                "AUTOREPLY.CONFIRMMODAL.QUESTION": "",
                "AUTOREPLY.CONFIRMMODAL.CONFIRMlABEL_DELETE": "",
                "AUTOREPLY.CONFIRMMODAL.CONFIRMlABEL_CANCEL": ""
            };
            const translationsRes = $translate.instant(Object.keys($scope.translations));
            for (let key in translationsRes) {
                if ({}.hasOwnProperty.call($scope.translations, key)) {
                    $scope.translations[key] = translationsRes[key];
                }
            }
            function filterCommands() {
                return triggerSearchFilter(sortTagSearchFilter(commandsServiceAutoReply.getCustomCommands(), sortTagsService.getSelectedSortTag("commands")), commandsServiceAutoReply.customCommandSearch);
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
                commandsServiceAutoReply.saveCustomCommand(command);
                commandsServiceAutoReply.refreshCommands();
                if (command.active) {
                    kolHistoryService.pushHistoryMsg(`Began a auto reply: ${command.trigger}`);
                } else {
                    kolHistoryService.pushHistoryMsg(`Ended a auto reply: ${command.trigger}`);
                }
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
                commandsServiceAutoReply.saveCustomCommand(command);
                commandsServiceAutoReply.refreshCommands();
            };

            $scope.deleteCustomCommand = command => {
                utilityService.showConfirmationModal({
                    title: $scope.translations['AUTOREPLY.CONFIRMMODAL.TITLE'],
                    question: $scope.translations['AUTOREPLY.CONFIRMMODAL.QUESTION'] + command.trigger + ' ?',
                    confirmLabel: $scope.translations['AUTOREPLY.CONFIRMMODAL.CONFIRMlABEL_DELETE'],
                    cancelLabel: $scope.translations['AUTOREPLY.CONFIRMMODAL.CONFIRMlABEL_CANCEL'],
                    confirmBtnType: "btn-danger"
                }).then(confirmed => {
                    if (confirmed) {
                        commandsServiceAutoReply.deleteCustomCommand(command);
                        commandsServiceAutoReply.refreshCommands();
                        kolHistoryService.pushHistoryMsg(`Deleted a auto reply: ${command.trigger}`);
                    }
                });
            };

            $scope.duplicateCustomCommand = command => {
                let copiedCommand = objectCopyHelper.copyObject("command", command);

                while (commandsServiceAutoReply.triggerExists(copiedCommand.trigger)) {
                    copiedCommand.trigger += "copy";
                }

                commandsServiceAutoReply.saveCustomCommand(copiedCommand);
                commandsServiceAutoReply.refreshCommands();
                kolHistoryService.pushHistoryMsg(`Duplicated a auto reply: ${command.trigger}`);
            };

            $scope.openAddOrEditCustomCommandModal = function(command) {
                utilityService.showModal({
                    component: "addOrEditCustomCommandModal",
                    resolveObj: {
                        command: () => command
                    },
                    closeCallback: resp => {
                        let action = resp.action,
                            command = resp.command;

                        switch (action) {
                        case "add":
                            gaService.sendEvent('auto_reply', 'new');
                            kolHistoryService.pushHistoryMsg(`Added a auto reply: ${command.trigger}`);
                            commandsServiceAutoReply.saveCustomCommand(command);
                            break;
                        case "update":
                            commandsServiceAutoReply.saveCustomCommand(command);
                            kolHistoryService.pushHistoryMsg(`Changed a auto reply: ${command.trigger}`);
                            break;
                        case "delete":
                            commandsServiceAutoReply.deleteCustomCommand(command);
                            break;
                        }

                        // Refresh Commands
                        commandsServiceAutoReply.refreshCommands();
                    }
                });
            };

            $scope.sortableOptions = {
                handle: ".dragHandle",
                'ui-preserve-size': true,
                stop: (e, ui) => {
                    console.log(e, ui);
                    if (sortTagsService.getSelectedSortTag("commands") != null &&
                        (commandsServiceAutoReply.customCommandSearch == null ||
                            commandsServiceAutoReply.customCommandSearch.length < 1)) return;
                    commandsServiceAutoReply.saveAllCustomCommands(commandsServiceAutoReply.commandsCache.customCommands);
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
