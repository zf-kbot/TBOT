"use strict";

const logger = require("../logwrapper");
const frontendCommunicator = require("../common/frontend-communicator");

let pendingSetupFilePath;
let windowReady = false;

function sendSetupPathToFrontend(path) {
    frontendCommunicator.send("setup-opened", path);
}
exports.setWindowReady = (ready) => {
    windowReady = ready;
    if (windowReady && pendingSetupFilePath) {
        sendSetupPathToFrontend(pendingSetupFilePath);
        pendingSetupFilePath = null;
    }
};

/**
 * @param {string[]} args
 */
exports.checkForTwitchbotSetupPath = (args) => {
    if (args == null) return;
    for (const arg of args) {
        if (arg.endsWith(".twitcherbotsetup")) {
            logger.info("Twitchbot setup file opened!", arg);
            if (windowReady) {
                sendSetupPathToFrontend(arg);
            } else {
                pendingSetupFilePath = arg;
            }
        }
    }
};