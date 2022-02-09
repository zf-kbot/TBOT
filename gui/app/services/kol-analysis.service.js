"use strict";
(function () {
    const profileManager = require("../../backend/common/profile-manager.js");
    const moment = require("moment");
    const uuid = require("uuid/v4");

    angular
        .module("twitcherbotApp")
        .factory("kolAchievementService", function ($translate) {
            let service = {};
            // function getDataFile(filePath) {
            //     // let filePath = '/data/analysis/' + path;
            //     let filePath = '/' + filePath;
            //     return profileManager.getJsonDbInProfile(filePath);
            // }

            // function getViewData(filePath) {
            //     try {
            //         let data = getDataFile(filePath).getData('/');
            //         return data ? data : [];
            //     } catch {
            //         return [];
            //     }
            // }
            function getDataFile(filePath) {
                return profileManager.getJsonDbInProfile(filePath);
            }

            function pushDataToFile(filePath, path, data) {
                try {
                    getDataFile(filePath).push(path, data, true);
                } catch (err) { }//eslint-disable-line no-empty
            }

            function saveDataMsgs(filePath, path, msg) {
                pushDataToFile(filePath, path, msg);
            }

            function getDataMsgs(filePath, path) {
                try {
                    let data = getDataFile(filePath).getData(path);
                    return data ? data : [];
                } catch (err) {
                    return [];
                }
            }
            //获取数据视图
            service.getTabViewData = function (filePath, path) {
                let viewsData = getDataMsgs(filePath, path);
                let dates = Object.keys(viewsData);
                const newDates = dates.map((date) => moment(date, "YYYY MM DD").locale('en').format("D MMM"));
                if (filePath === '/data/achievement/maxviewers') {
                    let newViewers = [];
                    let oldViewers = [];
                    let data = Object.values(viewsData);
                    for (let i = 0; i < data.length; i++) {
                        newViewers.push(data[i].newViewerNumber);
                        oldViewers.push(data[i].oldViewerNumber);
                    }
                    return service.setOptionStack('viewer', 'oldViewers', 'newViewers', newDates, oldViewers, newViewers);
                }
                if (filePath === '/data/achievement/bits') {
                    let totalBitsArray = [];
                    let data = Object.values(viewsData);
                    for (let i = 0; i < data.length; i++) {
                        let total = 0;
                        for (let j = 0; j < data[i].bits.length; j++) {
                            total += data[i].bits[j];
                        }
                        totalBitsArray.push(total);
                    }
                    return service.setOption('viewer', null, newDates, totalBitsArray);
                }
                if (filePath === '/data/achievement/subandgiftsub') {
                    let subMonth = [];
                    let giftSubMonth = [];
                    let data = Object.values(viewsData);
                    for (let i = 0; i < data.length; i++) {
                        let totalSub = 0;
                        let totalGiftSub = 0;
                        //判断当天有无sub
                        if ("subscriptions" in data[i]) {
                            for (let j = 0; j < data[i].subscriptions.length; j++) {
                                totalSub += data[i].subscriptions[j];
                            }
                            subMonth.push(totalSub);
                        } else {
                            subMonth.push(0);
                        }
                        //判断当天有无giftsub
                        if ("giftSubscriptions" in data[i]) {
                            for (let j = 0; j < data[i].giftSubscriptions.length; j++) {
                                totalGiftSub += data[i].giftSubscriptions[j];
                            }
                            giftSubMonth.push(totalGiftSub);
                        } else {
                            giftSubMonth.push(0);
                        }
                    }
                    return service.setOptionStack('viewer', 'Subscriptions', 'GiftedSubscriptions', newDates, subMonth, giftSubMonth);
                }
                return service.setOption('viewer', null, newDates, Object.values(viewsData));
            };

            // 补齐空日期
            service.fillEmptyDate = (option) => {
                const range = 56; // 8周56天
                const xAxis = option.xAxis.data;
                let newxAxis = new Array(range).fill('');
                let seriesLength = option.series.length;
                let newSeriesData = [];
                for (let i = 0; i < seriesLength; i++) {
                    newSeriesData[i] = new Array(range).fill(0);
                }
                // 匹配到的次数
                let matchCount = 0;
                for (let day = 0; day < range; day++) {
                    let date = moment().subtract(day, 'days').locale("en").format("D MMM");
                    newxAxis[range - day - 1] = date;
                    // 该处取到的是待匹配的最大日期
                    let i = xAxis.length - 1 - matchCount;
                    let oldDate = xAxis[i];
                    if (oldDate === date) { // 有该日数据
                        matchCount++;
                        for (let j = 0; j < seriesLength; j++) {
                            newSeriesData[j][range - day - 1] = option.series[j].data[i];
                        }
                    }
                }
                option.xAxis.data = newxAxis;
                for (let i = 0; i < seriesLength; i++) {
                    option.series[i].data = newSeriesData[i];
                }
            };

            service.setOptionStack = function (title, legendOne, legendTwo, xAxisData, seriesDataOne, seriesDataTwo) {
                let option =
                {
                    title: {
                        text: ''
                    },
                    tooltip: {},
                    label: {
                        show: true
                    },
                    legend: {
                        data: [legendOne, legendTwo],
                        tooltip: {
                            show: true,
                            formatter: function (params) {
                                if (params.name === 'oldViewers') {
                                    return $translate.instant("ACHIEVEMENT.HOVER.OLDVIEWERS");
                                } else if (params.name === 'newViewers') {
                                    return $translate.instant("ACHIEVEMENT.HOVER.NEWVIEWERS");
                                } else if (params.name === 'Subscriptions') {
                                    return $translate.instant("ACHIEVEMENT.HOVER.UNIT.MONTH");
                                } else if (params.name === 'GiftedSubscriptions') {
                                    return $translate.instant("ACHIEVEMENT.HOVER.UNIT.MONTH");
                                }
                            }
                        },
                        textStyle: {
                            color: '#9145ff'
                        },
                        bottom: 1
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
                        name: legendOne,
                        label: {
                            show: true,
                            formatter: function (params) {
                                return params.value > 0 ? params.value : '';
                            },
                            textStyle: {
                                color: '#000'
                            }
                        },
                        type: 'bar',
                        stack: 'Ad',
                        data: seriesDataOne
                    },
                    {
                        name: legendTwo,
                        label: {
                            show: true,
                            formatter: function (params) {
                                return params.value > 0 ? params.value : '';
                            },
                            textStyle: {
                                color: '#000'
                            }
                        },
                        type: 'bar',
                        stack: 'Ad',
                        data: seriesDataTwo
                    }]
                };
                return option;
            };
            service.setOption = function (title, legend, xAxisData, seriesData) {
                let option =
                {
                    title: {
                        text: ''
                    },
                    tooltip: {},
                    legend: {
                        data: [legend],
                        bottom: 1
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
                        type: 'bar',
                        data: seriesData
                    }]
                };
                return option;
            };

            return service;
        });
}());
