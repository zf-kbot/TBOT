"use strict";
const profileManager = require("../common/profile-manager");

function getStreamTagsDataFile() {
    return profileManager.getJsonDbInProfile('/streamtags');
}
function getStreamTagsDataMsgs(path) {
    try {
        let data = getStreamTagsDataFile().getData(path);
        return data ? data : 0;
    } catch (err) {
        return 0;
    }
}
function pushStreamTagsDataToFile(path, data) {
    try {
        getStreamTagsDataFile().push(path, data, true);
    } catch (err) { } //eslint-disable-line no-empty
}

function loadStreamTags(twitchTags) {
    if (!getStreamTagsDataMsgs("/exist")) {
        pushStreamTagsDataToFile("/exist", true);
        pushStreamTagsDataToFile("/stream", twitchTags);
    }
}

exports.loadStreamTags = loadStreamTags;