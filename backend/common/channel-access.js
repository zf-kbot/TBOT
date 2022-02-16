/* eslint-disable no-warning-comments */
"use strict";

const logger = require('../logwrapper');
const accountAccess = require("../common/account-access");
const twitchApi = require('../twitch-api/client');
const twitchChat = require('../chat/twitch-chat');
const deepmerge = require("deepmerge");
const uuidv4 = require("uuid/v4");
const NodeCache = require("node-cache");
let linkHeaderParser = require('parse-link-header');

// Holds an updating model of the streamers channel data.
/**@type {import('../mixer-api/resource/channels').MixerChannelSimple} */
let streamerChannelData;

exports.refreshStreamerChannelData = async () => {
    const client = twitchApi.getClient();
    if (client == null) {
        return;
    }
    //这里是twitch和微软mixer频道切换，目前mixer已弃用，但还是先将kraken替换为对应的helix
    const streamer = accountAccess.getAccounts().streamer;
    let channel = await client.helix.channels.getChannelInfo(streamer.userId);
    let channelData = channel._data;

    streamerChannelData = channelData;
};

exports.updateStreamerChannelData = async (newData) => {
    if (streamerChannelData == null) {
        await this.refreshStreamerChannelData();
    }

    streamerChannelData = deepmerge(streamerChannelData, newData);
    return streamerChannelData;
};

exports.getStreamerChannelData = async () => {
    if (streamerChannelData == null) {
        await this.refreshStreamerChannelData();
    }

    return streamerChannelData;
};