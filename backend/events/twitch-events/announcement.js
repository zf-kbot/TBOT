"use strict";

const eventManager = require("../../events/EventManager");

exports.triggerAnnouncement = (username, title, gamename) => {
    eventManager.triggerEvent("twitch", "announcement", {
        username,
        title,
        gamename
    });
};