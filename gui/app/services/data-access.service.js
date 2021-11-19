"use strict";
(function() {

    const dataAccess = require("../../backend/common/data-access.js");

    angular
        .module("twitcherbotApp")
        .factory("dataAccess", function() {
            return dataAccess;
        });
}());
