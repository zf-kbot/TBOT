"use strict";
(function () {
    const profileManager = require("../../backend/common/profile-manager.js");
    const moment = require("moment");
    const uuid = require("uuid/v4");

    angular
        .module("twitcherbotApp")
        .factory("kolAnalysisService", function (logger, connectionService, backendCommunicator, $q) {
            let service = {};

            function getViewerDataFile() {
                return profileManager.getJsonDbInProfile('/viewdata');
            }

            function getViewerData() {
                try {
                    let data = getViewerDataFile().getData('/');
                    logger.info(data);
                    return data ? data : [];
                } catch {
                    return [];
                }
            }
            //获取所有关注数量
            function getTotalFollowDataFile() {
                return profileManager.getJsonDbInProfile('/totalfollowdata');
            }

            function getTotoalFollowData() {
                try {
                    let data = getTotalFollowDataFile().getData('/');
                    logger.info(data);
                    return data ? data : [];
                } catch {
                    return [];
                }
            }
            //获取新增关注用户数量
            function getNewFollowDataFile() {
                return profileManager.getJsonDbInProfile('/newfollowdata');
            }

            function getNewfollowData() {
                try {
                    let data = getNewFollowDataFile().getData('/');
                    logger.info(data);
                    return data ? data : [];
                } catch {
                    return [];
                }
            }
            //获取取消关注数量
            function getNewUnfollowDataFile() {
                return profileManager.getJsonDbInProfile('/newunfollowdata');
            }

            function getNewUnfollowData() {
                try {
                    let data = getNewUnfollowDataFile().getData('/');
                    logger.info(data);
                    return data ? data : [];
                } catch {
                    return [];
                }
            }
            //当前浏览数据
            service.originViewData = getViewerData();
            service.totalFollowData = getTotoalFollowData();
            service.newFollowData = getNewfollowData();
            service.newUnfollowData = getNewUnfollowData();

            /*设置null是为了屏蔽表上方的小标题名称*/
            service.getViewsData = function (viewType) {
                //解析对应的数据，进行对应的整理；
                // return service.setOption("viewer", "viewer", Object.keys(service.originViewData), Object.values(service.originViewData));
                return service.setOption("viewer", null, Object.keys(service.originViewData), Object.values(service.originViewData));

            };
            //获取总共关注数量
            service.getTotalFollowedViewsData = function (totalFollowedType) {
                //解析对应的数据，进行对应的整理；
                return service.setOption("total followed", null, Object.keys(service.totalFollowData), Object.values(service.totalFollowData));
            };
            //获取取消订阅的数量
            service.getUnfollowedViewsData = function (unfollowedType) {
                //解析对应的数据，进行对应的整理；
                return service.setOption("new unfollowed", null, Object.keys(service.newUnfollowData), Object.values(service.newUnfollowData));
            };
            //获取订阅的数量
            service.getFollowedViewsData = function (followedType) {
                //解析对应的数据，进行对应的整理；
                return service.setOption("new followed", null, Object.keys(service.newFollowData), Object.values(service.newFollowData));
            };

            service.setOption = function (title, legend, xAxisData, seriesData) {
                let option =
                {
                    title: {
                        text: ''
                    },
                    tooltip: {},
                    legend: {
                        data: [legend]
                    },
                    xAxis: {
                        data: xAxisData,
                        axisLine: {
                            lineStyle: {
                                color: '#646464'
                            }
                        }
                    },
                    yAxis: {
                        splitLine: {
                            lineStyle: {
                                color: '#646464'
                            }
                        }
                    },
                    series: [{
                        name: legend,
                        type: 'line',
                        data: seriesData
                    }]
                };
                return JSON.parse(angular.toJson(option));
            };

            return service;
        });
}());
