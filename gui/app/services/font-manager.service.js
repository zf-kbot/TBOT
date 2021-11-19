"use strict";
(function() {

    const fontManager = require('../../backend/fontManager');

    angular
        .module("twitcherbotApp")
        .factory("fontManager", function() {
            return fontManager;
        });
}());
