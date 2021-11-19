"use strict";
const echarts = require("echarts");

(function () {
    angular
        .module("twitcherbotApp")
        // .controller("kolAnalysisController", function ($scope, kolAnalysisService, utilityService) {
        .controller("kolAnalysisController", function ($scope, kolAnalysisService, utilityService, gaService,logger) {
            gaService.sendEvent('analysis', 'open');
            $scope.changeActiveLayout = (layout) => {
                // eslint-disable-next-line camelcase
                $scope.active_layout = layout;
                gaService.sendEvent('analysis', 'change', layout);
            };
            $scope.kolAnalysisService = kolAnalysisService;

            $scope.active_layout = "analysis";

            window.addEventListener('resize', () => {
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'});
            });
            $scope.showViews = function (viewType) {
                gaService.sendEvent('analysis', 'change', 'views');
                $scope.myChart = echarts.init(document.getElementById('kol-analysis-views'));
                // var myChart = echarts.init(document.getElementById('kol-analysis-views'));
                //获取对应需要显示的数据;
                let option = kolAnalysisService.getViewsData(viewType);
                // 使用刚指定的配置项和数据显示图表。
                option.color = ['#9145ff'];
                $scope.myChart.setOption(option);
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'});
                // 指定图表的配置项和数据
                // var option = {
                //     title: {
                //         text: 'ECharts 入门示例1'
                //     },
                //     tooltip: {},
                //     legend: {
                //         data: ['销量']
                //     },
                //     xAxis: {
                //         data: ["衬衫", "羊毛衫", "雪纺衫", "裤子", "高跟鞋", "袜子"]
                //     },
                //     yAxis: {},
                //     series: [{
                //         name: '销量',
                //         type: 'bar',
                //         data: [5, 20, 36, 10, 10, 20]
                //     }]
                // };

            };

            $scope.showTotalFollowers = function (totalFollowedType) {
                gaService.sendEvent('analysis', 'change', 'total_followers');
                $scope.myChart = echarts.init(document.getElementById('kol-analysis-total-followers'));
                // var myChart = echarts.init(document.getElementById('kol-analysis-total-followers'));
                // 指定图表的配置项和数据
                // var option = {
                //     title: {
                //         text: 'Total Follwers'
                //     },
                //     tooltip: {},
                //     legend: {
                //         data: ['销量']
                //     },
                //     xAxis: {
                //         data: ["衬衫", "羊毛衫", "雪纺衫", "裤子", "高跟鞋", "袜子"]
                //     },
                //     yAxis: {},
                //     series: [{
                //         name: '销量',
                //         type: 'bar',
                //         data: [5, 20, 36, 10, 10, 20]
                //     }]
                // };
                let option = kolAnalysisService.getTotalFollowedViewsData(totalFollowedType);
                option.color = ['#9145ff'];
                // 使用刚指定的配置项和数据显示图表。
                $scope.myChart.setOption(option);
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'})
            };

            $scope.showNewFollowers = function (followedType) {
                gaService.sendEvent('analysis', 'change', 'new_followers');
                $scope.myChart = echarts.init(document.getElementById('kol-analysis-new-followed'));
                // var myChart = echarts.init(document.getElementById('kol-analysis-new-followed'));
                // 指定图表的配置项和数据
                // var option = {
                //     title: {
                //         text: 'New Followed'
                //     },
                //     tooltip: {},
                //     legend: {
                //         data: ['销量']
                //     },
                //     xAxis: {
                //         data: ["衬衫", "羊毛衫", "雪纺衫", "裤子", "高跟鞋", "袜子"]
                //     },
                //     yAxis: {},
                //     series: [{
                //         name: '销量',
                //         type: 'bar',
                //         data: [5, 20, 36, 10, 10, 20]
                //     }]
                // };

                let option = kolAnalysisService.getFollowedViewsData(followedType);
                option.color = ['#9145ff'];
                // 使用刚指定的配置项和数据显示图表。
                $scope.myChart.setOption(option);
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'})
            };

            $scope.showNewUnFollowers = function (unfollowedType) {
                gaService.sendEvent('analysis', 'change', 'new_unfollowers');
                $scope.myChart = echarts.init(document.getElementById('kol-analysis-new-unfollowed'));
                // var myChart = echarts.init(document.getElementById('kol-analysis-new-unfollowed'));
                // 指定图表的配置项和数据
                // var option = {
                //     title: {
                //         text: 'New Unfollowed'
                //     },
                //     tooltip: {},
                //     legend: {
                //         // data: ['销量']
                //     },
                //     xAxis: {
                //         // data: ["衬衫", "羊毛衫", "雪纺衫", "裤子", "高跟鞋", "袜子"]
                //         data: ["01", "02", "03", "04", "05", "06","07", "08", "09", "10", "11", "12","13", "14"]
                //     },
                //     yAxis: {},
                //     series: [{
                //         name: '销量',
                //         type: 'line',
                //         data: [5, 20, 36, 10, 10, 20, 5, 20, 36, 10, 10, 20, 5, 20, 36, 10, 10, 20]
                //     }]
                // };

                let option = kolAnalysisService.getUnfollowedViewsData(unfollowedType);
                option.color = ['#9145ff'];
                // 使用刚指定的配置项和数据显示图表。
                $scope.myChart.setOption(option);
                $scope.myChart.resize({width: window.innerWidth - 300 + 'px'})
            };
        });
}());
