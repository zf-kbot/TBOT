"use strict";

const logger = require("../logwrapper");
const kolPollAccess = require("./kol-poll-access");
const connectionManager = require("../common/connection-manager");
const accountAccess = require("../common/account-access");
const { TriggerType } = require("../common/EffectType");
const effectRunner = require("../common/effect-runner");
const moment = require("moment");
const twitchApi = require("../twitch-api/api");

async function beginKollPoll(kolPollId) {
    // begin a new kolPoll which is copied from the origin kolpoll
    // let kolPoll = kolPollAccess.getKolPoll(kolPollId);
    // let tempChoices = kolPoll.choices.map(item => { title: item.title });
    // let response = await twitchApi.kolPolls.createKolPoll(kolPoll.title, kolPoll.duration, tempChoices);

}
kolPollAccess.on("kolPoll-save", kolPoll => {
    beginKollPoll(kolPoll);
});

exports.beginKollPoll = beginKollPoll;