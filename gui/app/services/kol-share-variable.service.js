"use strict";
(function () {

    angular
        .module("twitcherbotApp")
        .factory("kolShareVariableService", function (logger) {
            // 主要用以保存每次初始化后的初始值，在运行过程中被其他controller修改的情况
            logger.info("kolShareVariableService init...");
            let service = {};

            service.shareVariables = {
                streamInfo: {
                    isOnInitDidBefore: false,
                    streamInfo: {},
                    selectedGame: "",
                    tags: []
                }
            };

            return service;
        });
}());
