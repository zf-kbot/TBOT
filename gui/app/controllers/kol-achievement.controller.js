"use strict";
const echarts = require("echarts");

(function () {
    angular
        .module("twitcherbotApp")
        .controller("kolAchievementController", function ($scope, $translate, kolAchievementService, utilityService, gaService, connectionService) {
            $scope.connectedStatus = connectionService.accounts.streamer.loggedIn;
            $scope.loading = false;
            gaService.sendEvent('achievement', 'open');
            $scope.active = 0;
            $scope.tabId = "Max Viewers";
            $scope.elementIds = ["kol-analysis-views", "kol-analysis-total-followers", "kol-analysis-new-followed", "kol-analysis-subscriptions", "kol-analysis-bits"];
            $scope.tabs = ["Max Viewers", "Total Followers", "New Followers", "Subscriptions", "Bits"];
            $scope.filePath = ["/data/achievement/maxviewers", "/data/achievement/follower", "/data/achievement/newfollower", "/data/achievement/subandgiftsub", "/data/achievement/bits"];

            $scope.tabsTranslations = $translate.instant($scope.tabs.map(v => ("achievement.tabs." + v).replace(/ /g, '_').toUpperCase()));
            $scope.toTranslationsTabKey = tab => ('achievement.tabs.' + tab).replace(/ /g, '_').toUpperCase();

            $scope.changeTab = function(tab) {
                $scope.active = $scope.tabs.indexOf(tab);
                $scope.myChart = echarts.init(document.getElementById($scope.elementIds[$scope.active]));
                let option = kolAchievementService.getTabViewData($scope.filePath[$scope.active], '/');
                kolAchievementService.fillEmptyDate(option);
                option.color = ['#7F50ED', '#B455EE'];
                $scope.myChart.setOption(option);
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'});
                gaService.sendEvent('achievement', 'change', tab);
            };
            $scope.changeActiveLayout = (layout) => {
                // eslint-disable-next-line camelcase
                $scope.active_layout = layout;
                gaService.sendEvent('achievement', 'change', layout);
            };
            $scope.kolAchievementService = kolAchievementService;

            $scope.active_layout = "analysis";

            window.addEventListener('resize', () => {
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'});
            });

            setTimeout(() => {
                $scope.loading = true;
            }, 0);
        });
}());
