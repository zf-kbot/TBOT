"use strict";


(function() {
    const gaManager = require("../../backend/common/ga-manager.js");

    angular
        .module("twitcherbotApp")
        .factory("gaService", function($location) {
            let service = {};

            service.sendPageview = () => {
                gaManager.sendPageview($location.url());
            };

            service.sendEvent = (category, action, label = '', value = 1) => {
                gaManager.sendEvent(category, action, label, value);
            };

            return service;
        });
}());