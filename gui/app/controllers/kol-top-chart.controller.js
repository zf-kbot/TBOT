"use strict";
(function () {
    angular
        .module("twitcherbotApp")
        .controller("kolTopChartController", function ($scope, $translate, kolTopChartService, utilityService, gaService, logger, backendCommunicator, $q, connectionService) {
            $scope.connectedStatus = connectionService.accounts.streamer.loggedIn;
            $scope.loading = false;
            gaService.sendEvent('top chart', 'open');

            $scope.ktcs = kolTopChartService;
            let startTime = $scope.ktcs.getDataFromFile("/last_section/started_at");
            let endTime = $scope.ktcs.getDataFromFile("/last_section/ended_at");
            logger.debug(`last_section live started at: ${startTime}, ended at: ${endTime}`);
            let queryTime = {
                "startTime": startTime,
                "endTime": endTime
            };

            $scope.ktcs.getKolTopChatters(queryTime);
            $scope.ktcs.getKolTopEmotes(queryTime);
            $scope.ktcs.getKolTopViewTimes(queryTime);

            $scope.active = 0;
            $scope.tabId = "Chatters";
            $scope.elementIds = ["kol-view-time", "kol-chatters-view", "kol-emotes-view"];
            $scope.tabs = ["View Time", "Chatters", "Emotes"];
            $scope.activeLayout = "Session";

            $scope.tabsTranslations = $translate.instant($scope.tabs.map(v => ("top chart.tabs." + v).replace(/ /g, '_').toUpperCase()));
            $scope.toTranslationsTabKey = tab => ('top chart.tabs.' + tab).replace(/ /g, '_').toUpperCase();

            $scope.groupBy = function (list, keyGetter) {
                const map = new Map();
                list.forEach((item) => {
                    const key = keyGetter(item);
                    const collection = map.get(key);
                    if (!collection) {
                        map.set(key, [item]);
                    } else {
                        collection.push(item);
                    }
                });
                return map;
            };
            // $scope.getKolViewTimes = () => {
            //     $q.when(backendCommunicator.fireEventAsync('getTopViewTimes'), new Date())
            //         .then(viewTimes => {
            //             $scope.kolViewTimes = viewTimes;
            //         });
            // };

            $scope.changeTab = function(tab) {
                $scope.active = $scope.tabs.indexOf(tab);
                gaService.sendEvent('top chart', 'change', tab);
            };
            $scope.changeActiveLayout = (layout) => {
                // eslint-disable-next-line camelcase
                $scope.activeLayout = layout;
                startTime = new Date().setHours(0, 0, 0, 0);
                if (layout === "Session") {
                    startTime = $scope.ktcs.getDataFromFile("/last_section/started_at");
                    endTime = $scope.ktcs.getDataFromFile("/last_section/ended_at");
                    queryTime = {
                        "startTime": startTime,
                        "endTime": endTime
                    };
                } else if (layout === "Week") {
                    startTime = startTime - 24 * 60 * 60 * 1000 * 6;
                    endTime = startTime + 24 * 60 * 60 * 1000 * 7;
                    queryTime = {
                        "startTime": startTime,
                        "endTime": endTime
                    };
                } else if (layout === "Month") {
                    startTime = startTime - 24 * 60 * 60 * 1000 * 29;
                    endTime = startTime + 24 * 60 * 60 * 1000 * 30;
                    queryTime = {
                        "startTime": startTime,
                        "endTime": endTime
                    };
                }
                $scope.ktcs.getKolTopChatters(queryTime);
                $scope.ktcs.getKolTopEmotes(queryTime);
                $scope.ktcs.getKolTopViewTimes(queryTime);
                gaService.sendEvent('top chart', 'change', layout);
            };
            window.addEventListener('resize', () => {
                if (typeof $scope.myChart === 'undefined') {
                    return;
                }
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'});
            });

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

            setTimeout(() => {
                $scope.loading = true;
            }, 0);
        });
}());
