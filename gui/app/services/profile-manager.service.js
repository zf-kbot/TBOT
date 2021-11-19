"use strict";
(function() {

    const profileManager = require("../../backend/common/profile-manager.js");

    angular
        .module("twitcherbotApp")
        .factory("profileManager", function() {
            return profileManager;
        });
}());
