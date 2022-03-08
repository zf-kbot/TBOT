"use strict";

(function () {
    angular
        .module("twitcherbotApp")
        .factory("sidebarManager", function ($timeout, $rootScope, settingsService, $translate, logger) {
            let service = {};

            service.navExpanded = settingsService.getSidebarExpanded();

            service.toggleNav = function () {
                service.navExpanded = !service.navExpanded;
                $rootScope.$broadcast("navToggled");
                settingsService.setSidebarExpanded(service.navExpanded);
            };

            service.currentTab = "chat feed";
            service.currentTabName = "Dashboard";
            service.currentTabId = "Chat Feed";

            service.setTab = function (tabId) {
                service.currentTabId = tabId;
                service.currentTab = tabId.toLowerCase();

                $translate("TABID." + tabId.replace(/ |-/g, "_").toUpperCase()).then((ret) => {
                    service.currentTabName = ret;
                });

                //hack that somewhat helps with the autoupdate slider styling issues on first load
                $timeout(function () {
                    $rootScope.$broadcast("rzSliderForceRender");
                }, 50);
            };

            service.tabIsSelected = function (tabId) {
                return service.currentTab.toLowerCase() === tabId.toLowerCase();
            };

            service.currentTabIsFullScreen = function () {
                return (
                    service.currentTab.toLowerCase() === "chat feed" ||
                    service.currentTab.toLowerCase() === "commands" ||
                    service.currentTab.toLowerCase() === "effects" ||
                    service.currentTab.toLowerCase() === "events" ||
                    service.currentTab.toLowerCase() === "channel rewards" ||
                    service.currentTab.toLowerCase() === "moderation" ||
                    service.currentTab.toLowerCase() === "buttons" ||
                    // service.currentTab.toLowerCase() === "polls" ||
                    service.currentTab.toLowerCase() === "message filter" ||
                    service.currentTab.toLowerCase() === "auto reply" ||
                    service.currentTab.toLowerCase() === "blacklisted words" ||
                    service.currentTab.toLowerCase() === "chat notifications" ||
                    service.currentTab.toLowerCase() === "top chart" ||
                    service.currentTab.toLowerCase() === "loyal setting" ||
                    service.currentTab.toLowerCase() === "leaderboard"
                );
            };

            service.currentTabShouldntScroll = function () {
                return (
                    service.currentTab.toLowerCase() === "chat feed" ||
                    service.currentTab.toLowerCase() === "buttons" ||
                    service.currentTab.toLowerCase() === "effects" ||
                    service.currentTab.toLowerCase() === "channel rewards" ||
                    service.currentTab.toLowerCase() === "events" ||
                    service.currentTab.toLowerCase() === "commands"
                );
            };
            $rootScope.$on("langChanged", () => {
                service.setTab(service.currentTabId);
            });

            return service;
        });

    // routes for tabs
    angular.module("twitcherbotApp").config([
        "$routeProvider",
        "$locationProvider",
        function ($routeProvider) {
            $routeProvider

                .when("/viewer-roles", {
                    templateUrl: "./templates/_viewerroles.html",
                    controller: "viewerRolesController"
                })

                .when("/", {
                    templateUrl: "./templates/chat/_chat-messages.html",
                    controller: "chatMessagesController"
                })

                .when("/chat-feed", {
                    templateUrl: "./templates/chat/_chat-messages.html",
                    controller: "chatMessagesController"
                })

                .when("/achievement", {
                    templateUrl: "./templates/_kol-achievement.html",
                    controller: "kolAchievementController"
                })

                .when("/top-chart", {
                    templateUrl: "./templates/data/_kol-top-chart.html",
                    controller: "kolTopChartController"
                })

                .when("/polls", {
                    templateUrl: "./templates/interactive-tool/_kol-polls.html",
                    controller: "kolPollsController"
                })

                .when("/kol-chat-notifications", {
                    templateUrl: "./templates/interactive-tool/_kol-chat-notifications.html",
                    controller: "kolChatNotificationsController"
                })

                .when("/kol-timers", {
                    templateUrl: "./templates/commands/_kol-timers.html",
                    controller: "kolTimersController"
                })

                .when("/kol-loyal-setting", {
                    templateUrl: "./templates/loyalty-community/_kol-loyal-setting.html",
                    controller: "kolLoyaltySettingController"
                })

                .when("/kol-leadership", {
                    templateUrl: "./templates/loyalty-community/_kol-leadership.html"
                })

                .when("/message-filter", {
                    templateUrl: "./templates/guard/_kol-message-filter.html",
                    controller: "kolMessageFilterController"
                })

                .when("/blacklisted-words", {
                    templateUrl: "./templates/guard/_kol-blacklisted-words.html",
                    controller: "kolBlacklistedWordsController"
                })

                .when("/auto-reply", {
                    templateUrl: "./templates/commands/_kol-auto-reply.html",
                    controller: "kolAutoReplyController"
                })

                .when("/commands", {
                    templateUrl: "./templates/chat/_commands.html",
                    controller: "commandsController"
                })

                .when("/effects", {
                    templateUrl: "./templates/_effects.html",
                    controller: "effectsController"
                })

                .when("/channel-rewards", {
                    templateUrl: "./templates/_channel-rewards.html",
                    controller: "channelRewardsController"
                })

                .when("/moderation", {
                    templateUrl: "./templates/_moderation.html",
                    controller: "moderationController"
                })

                .when("/settings", {
                    templateUrl: "./templates/_settings.html",
                    controller: "settingsController"
                })

                .when("/updates", {
                    templateUrl: "./templates/_updates.html",
                    controller: "updatesController"
                })

                .when("/events", {
                    templateUrl: "./templates/live-events/_events.html",
                    controller: "eventsController"
                })

                .when("/hotkeys", {
                    templateUrl: "./templates/_hotkeys.html",
                    controller: "hotkeysController"
                })

                .when("/currency", {
                    templateUrl: "./templates/_currency.html",
                    controller: "currencyController"
                })

                .when("/timers", {
                    templateUrl: "./templates/_timers.html",
                    controller: "timersController"
                })

                .when("/viewers", {
                    templateUrl: "./templates/viewers/_viewers.html",
                    controller: "viewersController"
                })

                .when("/quotes", {
                    templateUrl: "./templates/_quotes.html",
                    controller: "quotesController"
                })

                .when("/counters", {
                    templateUrl: "./templates/_counters.html",
                    controller: "countersController"
                })

                .when("/games", {
                    templateUrl: "./templates/_games.html",
                    controller: "gamesController"
                });
        }
    ]);
}(window.angular));
