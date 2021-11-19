"use strict";

const eventManager = require("./EventManager");

exports.loadEventSources = () => {
    // get event definitions
    const twitcherbotEventSource = require("./builtin/twitcherbotEventSource");
    const twitchEventSource = require("./builtin/twitchEventSource");

    // register them
    eventManager.registerEventSource(twitcherbotEventSource);
    eventManager.registerEventSource(twitchEventSource);
};

exports.loadEventFilters = () => {
    const twitchEventsFilters = require("./builtin/twitchEventsFilters");
    eventManager.registerEventFilters(twitchEventsFilters);
};
