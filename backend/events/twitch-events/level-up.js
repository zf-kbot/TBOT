"use strict";

const eventManager = require("../../events/EventManager");

exports.triggerLevelUp = (userName, userLevel) => {
    eventManager.triggerEvent("twitch", "level-up", {
        userName,
        userLevel
    });
};