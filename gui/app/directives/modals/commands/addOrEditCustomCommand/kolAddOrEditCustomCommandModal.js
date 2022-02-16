"use strict";

// Modal for adding or editing a command

(function () {
    const uuid = require("uuid/v4");

    angular.module("twitcherbotApp").component("kolAddOrEditCustomCommandModal", {
        templateUrl:
            "./directives/modals/commands/addOrEditCustomCommand/kolAddOrEditCustomCommandModal.html",
        bindings: {
            resolve: "<",
            close: "&",
            dismiss: "&",
            modalInstance: "<"
        },
        controller: function ($scope, utilityService, commandsService, ngToast, settingsService, $translate,
            $timeout
        ) {
            let $ctrl = this;
            $ctrl.translations = {
                'BLACKLISTEDWORDS.PHRASE_TOOLTIP': "",
                'BLACKLISTEDWORDS.TIME_OUT_TOOLTIP': ""
            };
            const translationRes = $translate.instant(Object.keys($ctrl.translations));
            for (let key in $ctrl.translations) {
                if ({}.hasOwnProperty.call($ctrl.translations, key)) {
                    $ctrl.translations[key] = translationRes[key];
                }
            }
            //原始的commandmodal.js
            $ctrl.command = {
                active: true,
                simple: !settingsService.getDefaultToAdvancedCommandMode(),
                sendCooldownMessage: true,
                cooldown: {},
                effects: {
                    id: uuid(),
                    list: [
                        {
                            id: uuid(),
                            type: "twitcherbot:modTimeout",
                            username: "$username",
                            time: "1"
                        }
                    ]
                },
                restrictionData: {
                    restrictions: [],
                    mode: "all",
                    sendFailMessage: true
                },
                autoDeleteTrigger: true,
                scanWholeMessage: true,
                ignoreLetterCase: true,
                ignoreWordBoundry: true,
                timeExpires: 160,
                checkUserName: true
                //新增
                // definition: {
                //     id: "twitcherbot:modTimeout",
                //     name: "Timeout",
                //     description: "Timeout a user.",
                //     icon: "fad fa-user-clock",
                //     categories: [EffectCategory.COMMON, EffectCategory.MODERATION],
                //     dependencies: [EffectDependency.CHAT],
                //     triggers: effectModels.buildEffectTriggersObject(
                //         [ControlKind.BUTTON, ControlKind.TEXTBOX],
                //         [InputEvent.MOUSEDOWN, InputEvent.KEYDOWN, InputEvent.SUBMIT],
                //         EffectTrigger.ALL
                //     )
                // },
                // expiration :{
                //     value: $ctrl.command.timeExpires,
                //     options: {
                //         floor: 0,
                //         ceil: 350,
                //         // step: 0.1,
                //         // precision: 1,
                //         // onChange: (_, value) => {
                //         //     settingsService.setTtsVoiceRate(value);
                //         // }
                //     }
                // };
            };

            // $ctrl.command.effects.list[0].time  = time_input;
            $scope.trigger = "command";
            $ctrl.switchCommandMode = () => {
                const currentlyAdvanced = !$ctrl.command.simple;
                if (currentlyAdvanced) {
                    const willBeRemoved = [];
                    if ($ctrl.command.effects.list.length > 1 ||
                        $ctrl.command.effects.list.some(e => e.type !== "twitcherbot:chat")) {
                        willBeRemoved.push("all effects save for a single Chat effect");
                    }
                    if ($ctrl.command.restrictionData.restrictions.length > 1 ||
                        $ctrl.command.restrictionData.restrictions.some(r => r.type !== "twitcherbot:permissions")) {
                        willBeRemoved.push("all non-Permission restrictions");
                    }
                    if ($ctrl.command.fallbackSubcommand != null ||
                        ($ctrl.command.subCommands && $ctrl.command.subCommands.length > 0)) {
                        willBeRemoved.push("all Subcommands");
                    }
                    if (willBeRemoved.length > 0) {
                        utilityService.showConfirmationModal({
                            title: "Switch To Simple Mode",
                            question: `Switching to Simple Mode will remove: ${willBeRemoved.join(", ")}. Are you sure you want to switch?`,
                            confirmLabel: "Switch",
                            confirmBtnType: "btn-danger"
                        }).then(confirmed => {
                            if (confirmed) {
                                $ctrl.command.simple = !$ctrl.command.simple;
                                $ctrl.command.subCommands = [];
                                $ctrl.command.fallbackSubcommand = null;
                            }
                        });
                    } else {
                        $ctrl.command.simple = !$ctrl.command.simple;
                    }

                } else {
                    // remove the chat message if the user didnt input anything
                    const responseMessage = $ctrl.command.effects.list[0] && $ctrl.command.effects.list[0].message && $ctrl.command.effects.list[0].message.trim();
                    if (!responseMessage || responseMessage === "") {
                        $ctrl.command.effects.list = [];
                    }
                    $ctrl.command.simple = !$ctrl.command.simple;

                    if ($ctrl.isNewCommand &&
                        !settingsService.getDefaultToAdvancedCommandMode() &&
                        !settingsService.getSeenAdvancedCommandModePopup()) {
                        settingsService.setSeenAdvancedCommandModePopup(true);
                        utilityService.showConfirmationModal({
                            title: "Default Mode",
                            question: `Do you want to always use Advanced Mode for new Commands?`,
                            tip: "Note: You can change this in Settings > Commands at any time",
                            confirmLabel: "Yes",
                            confirmBtnType: "btn-default",
                            cancelLabel: "Not right now",
                            cancelBtnType: "btn-default"
                        }).then(confirmed => {
                            if (confirmed) {
                                settingsService.setDefaultToAdvancedCommandMode(true);
                                ngToast.create({
                                    className: 'success',
                                    content: "New commands will now default to Advanced Mode.",
                                    timeout: 7000
                                });
                            }
                        });
                    }
                }
            };

            // $ctrl.getValue = function(item){
            //     return item >> 0;
            // }

            $ctrl.refreshSlider = function () {
                $timeout(function () {
                    $scope.$broadcast('rzSliderForceRender');
                });
            };

            // $scope.$watch("$ctrl.command.timeExpires",function(){
            //     $ctrl.refreshSlider();
            // })

            $ctrl.$onInit = function () {
                $ctrl.refreshSlider();
                //下面部分是添加的
                if ($ctrl.command.effects && $ctrl.command.effects.list) {
                    const chatEffect = $ctrl.command.effects.list.find(e => e.type === "twitcherbot:modTimeout");
                    if (chatEffect) {
                        $ctrl.chatEffect = {
                            id: uuid(),
                            type: "twitcherbot:modTimeout",
                            username: chatEffect.username,
                            time: chatEffect.time
                        };
                    }
                }
                if ($ctrl.chatEffect == null) {
                    $ctrl.chatEffect = {
                        id: uuid(),
                        type: "twitcherbot:modTimeout",
                        username: "$username",
                        time: 2
                    };
                }
                $ctrl.command.effects.list = [$ctrl.chatEffect];
                $ctrl.command.effects.list[0].time = parseInt($ctrl.command.effects.list[0].time);

                //上面部分是添加的

                if ($ctrl.resolve.command == null) {
                    $ctrl.isNewCommand = true;
                } else {
                    $ctrl.command = JSON.parse(JSON.stringify($ctrl.resolve.command));
                    if ($ctrl.command.simple == null) {
                        $ctrl.command.simple = false;
                    }
                }

                if ($ctrl.command.ignoreBot === undefined) {
                    $ctrl.command.ignoreBot = true;
                }

                if ($ctrl.command.sendCooldownMessage == null) {
                    $ctrl.command.sendCooldownMessage = true;
                }

                // let modalId = $ctrl.resolve.modalId;
                // utilityService.addSlidingModal(
                //     $ctrl.modalInstance.rendered.then(() => {
                //         let modalElement = $("." + modalId).children();
                //         return {
                //             element: modalElement,
                //             name: "Edit Command",
                //             id: modalId,
                //             instance: $ctrl.modalInstance
                //         };
                //     })
                // );

                $scope.$on("modal.closing", function () {
                    utilityService.removeSlidingModal();
                });

            };


            $ctrl.effectListUpdated = function (effects) {
                $ctrl.command.effects = effects;
            };

            $ctrl.deleteSubcommand = (id) => {
                utilityService.showConfirmationModal({
                    title: "Delete Subcommand",
                    question: `Are you sure you want to delete this subcommand?`,
                    confirmLabel: "Delete",
                    confirmBtnType: "btn-danger"
                }).then(confirmed => {
                    if (confirmed) {
                        if (id === "fallback-subcommand") {
                            $ctrl.command.fallbackSubcommand = null;
                        } else if ($ctrl.command.subCommands) {
                            $ctrl.command.subCommands = $ctrl.command.subCommands.filter(sc => sc.id !== id);
                        }
                    }
                });
            };

            $ctrl.editSubcommand = (id) => {
                let subcommand;
                if (id === "fallback-subcommand") {
                    subcommand = $ctrl.command.fallbackSubcommand;
                } else if ($ctrl.command.subCommands) {
                    subcommand = $ctrl.command.subCommands.find(sc => sc.id === id);
                }
                if (subcommand) {
                    $ctrl.openAddSubcommandModal(subcommand);
                }
            };

            $ctrl.openAddSubcommandModal = (arg) => {
                utilityService.showModal({
                    component: "addOrEditSubcommandModal",
                    size: "sm",
                    resolveObj: {
                        arg: () => arg,
                        hasNumberArg: () => $ctrl.command.subCommands && $ctrl.command.subCommands.some(sc => sc.arg === "\\d+"),
                        hasUsernameArg: () => $ctrl.command.subCommands && $ctrl.command.subCommands.some(sc => sc.arg === "@\\w+"),
                        hasFallbackArg: () => $ctrl.command.fallbackSubcommand != null,
                        otherArgNames: () => $ctrl.command.subCommands && $ctrl.command.subCommands.filter(c => !c.regex && (arg ? c.arg !== arg.arg : true)).map(c => c.arg.toLowerCase()) || []
                    },
                    closeCallback: newArg => {
                        if (newArg.fallback) {
                            $ctrl.command.fallbackSubcommand = newArg;
                        } else {
                            if ($ctrl.command.subCommands == null) {
                                $ctrl.command.subCommands = [newArg];
                            } else {
                                $ctrl.command.subCommands = $ctrl.command.subCommands.filter(sc => sc.id !== newArg.id);
                                $ctrl.command.subCommands.push(newArg);
                            }
                        }
                    }
                });
            };


            $ctrl.delete = function () {
                if ($ctrl.isNewCommand) return;
                utilityService.showConfirmationModal({
                    title: "Delete Command",
                    question: `Are you sure you want to delete this command?`,
                    confirmLabel: "Delete",
                    confirmBtnType: "btn-danger"
                }).then(confirmed => {
                    if (confirmed) {
                        $ctrl.close({ $value: { command: $ctrl.command, action: "delete" } });
                    }
                });
            };

            $ctrl.save = function () {
                if ($ctrl.command.trigger == null || $ctrl.command.trigger === "") {
                    ngToast.create("Please provide a trigger.");
                    return;
                }

                // if ($ctrl.command.simple) {
                //     const responseMessage = $ctrl.command.effects.list[0] && $ctrl.command.effects.list[0].message && $ctrl.command.effects.list[0].message.trim();
                //     if (!responseMessage || responseMessage === "") {
                //         ngToast.create("Please provide a response message.");
                //         return;
                //     }
                // }

                if (commandsService.triggerExists($ctrl.command.trigger, $ctrl.command.id)) {
                    ngToast.create("A custom command with this trigger already exists.");
                    return;
                }

                let action = $ctrl.isNewCommand ? "add" : "update";
                $ctrl.close({
                    $value: {
                        command: $ctrl.command,
                        action: action
                    }
                });
            };

            $ctrl.kolSave = function () {
                if ($ctrl.command.trigger == null || $ctrl.command.trigger === "") {
                    ngToast.create("Please provide a trigger.");
                    return;
                }
                // let action = $ctrl.isNewCommand ? "add" : "update";
                $ctrl.close({
                    $value: {
                        command: $ctrl.command,
                        action: "add"
                    }
                });
            };
        }
    });
}());
