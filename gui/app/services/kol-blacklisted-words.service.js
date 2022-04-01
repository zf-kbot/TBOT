"use strict";
(function() {
    //This manages command data
    const profileManager = require("../../backend/common/profile-manager.js");
    const moment = require("moment");

    angular
        .module("twitcherbotApp")
        .factory("commandsService", function(
            logger,
            connectionService,
            listenerService,
            backendCommunicator
        ) {
            let service = {};

            service.customCommandSearch = "";

            let getCommandsDb = () =>
                profileManager.getJsonDbInProfile("/chat/commands");

            // in memory commands storage
            service.commandsCache = {
                customCommands: []
            };

            // Refresh commands cache
            service.refreshCommands = function() {
                let commandsDb = getCommandsDb();

                let cmdData;
                try {
                    cmdData = commandsDb.getData("/");
                } catch (err) {
                    logger.warn("error getting command data", err);
                    return;
                }

                if (cmdData.customCommands) {
                    logger.debug("loading custom commands: " + cmdData.customCommands);
                    service.commandsCache.customCommands = Object.values(cmdData.customCommands);
                }

                service.commandsCache.systemCommands = listenerService.fireEventSync(
                    "getAllSystemCommandDefinitions"
                );

                // Refresh the command cache.
                ipcRenderer.send("refreshCommandCache");
            };

            backendCommunicator.on("custom-commands-updated", () => {
                service.refreshCommands();
            });

            service.getSystemCommands = () => service.commandsCache.systemCommands;

            service.getCustomCommands = () => service.commandsCache.customCommands;
            //保存用户自定义的黑名单词汇
            service.saveCustomCommand = function(command, user = null) {
                logger.debug("saving command: " + command.trigger);
                if (command.id == null || command.id === "") {
                    // generate id for new command
                    const uuidv1 = require("uuid/v1");
                    command.id = uuidv1();

                    command.createdBy = user
                        ? user
                        : connectionService.accounts.streamer.username;
                    command.createdAt = moment().format();
                } else {
                    command.lastEditBy = user
                        ? user
                        : connectionService.accounts.streamer.username;
                    command.lastEditAt = moment().format();
                }

                if (command.count == null) {
                    command.count = 0;
                }

                let commandDb = getCommandsDb();

                // Note(ebiggz): Angular sometimes adds properties to objects for the purposes of two way bindings
                // and other magical things. Angular has a .toJson() convienence method that coverts an object to a json string
                // while removing internal angular properties. We then convert this string back to an object with
                // JSON.parse. It's kinda hacky, but it's an easy way to ensure we arn't accidentally saving anything extra.
                let cleanedCommand = JSON.parse(angular.toJson(command));

                try {
                    commandDb.push("/customCommands/" + command.id, cleanedCommand);
                    // await twitchChat.timeoutUser("hh_zfnice", command.effects.list[0].time);
                } catch (err) {} //eslint-disable-line no-empty
            };

            service.saveAllCustomCommands = (commands) => {
                service.commandsCache.customCommands = commands;
                const cleanedCommands = JSON.parse(angular.toJson(commands));
                try {
                    const commandDb = getCommandsDb();
                    const customCommandsObj = cleanedCommands.reduce((acc, command) => {
                        acc[command.id] = command;
                        return acc;
                    }, {});
                    commandDb.push("/customCommands", customCommandsObj);
                    ipcRenderer.send("refreshCommandCache");
                } catch (err) {} //eslint-disable-line no-empty
            };

            service.saveSystemCommandOverride = function(command) {
                listenerService.fireEvent(
                    "saveSystemCommandOverride",
                    JSON.parse(angular.toJson(command))
                );

                let index = service.commandsCache.systemCommands.findIndex(
                    c => c.id === command.id
                );

                service.commandsCache.systemCommands[index] = command;
            };

            service.triggerExists = function(trigger, id = null) {
                if (trigger == null) return false;

                trigger = trigger != null ? trigger.toLowerCase() : "";

                let foundDuplicateCustomCmdTrigger = service.commandsCache.customCommands.some(
                    command =>
                        command.id !== id && command.trigger && command.trigger.toLowerCase() === trigger
                );

                let foundDuplicateSystemCmdTrigger = service.commandsCache.systemCommands.some(
                    command => command.active && command.trigger && command.trigger.toLowerCase() === trigger
                );

                return foundDuplicateCustomCmdTrigger || foundDuplicateSystemCmdTrigger;
            };

            // Deletes a command.
            service.deleteCustomCommand = function(command) {
                let commandDb = getCommandsDb();

                if (command == null || command.id == null || command.id === "") return;

                try {
                    commandDb.delete("/customCommands/" + command.id);
                } catch (err) {
                    logger.warn("error when deleting command", err);
                } //eslint-disable-line no-empty
            };
            //待整理
            listenerService.registerListener(
                {
                    type: listenerService.ListenerType.SYS_CMDS_UPDATED
                },
                () => {
                    service.refreshCommands();
                }
            );

            ipcRenderer.on("commandCountUpdate", function(event, data) {
                let command = service
                    .getCustomCommands()
                    .find(c => c.id === data.commandId);
                if (command != null) {
                    command.count = data.count;
                    service.saveCustomCommand(command);
                }
            });
            //待整理
            listenerService.registerListener(
                {
                    type: listenerService.ListenerType.SAVE_CUSTOM_COMMAND
                },
                (data) => {
                    service.saveCustomCommand(data.command, data.user);

                    let currentIndex = service.commandsCache.customCommands.findIndex(c => c.trigger === data.command.trigger);

                    if (currentIndex === -1) {
                        service.commandsCache.customCommands.push(data.command);
                    } else {
                        service.commandsCache.customCommands[currentIndex] = data.command;
                    }

                    // Refresh the backend command cache.
                    ipcRenderer.send("refreshCommandCache");
                }
            );
            //待整理
            listenerService.registerListener(
                {
                    type: listenerService.ListenerType.REMOVE_CUSTOM_COMMAND
                },
                (data) => {

                    let command = service.commandsCache.customCommands.find(c => c.trigger === data.trigger);

                    service.deleteCustomCommand(command);

                    service.commandsCache.customCommands = service.commandsCache.customCommands.filter(c => c.id !== command.id);

                    // Refresh the backend command cache.
                    ipcRenderer.send("refreshCommandCache");
                }
            );


            return service;
        });
}());
