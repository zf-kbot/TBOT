"use strict";
const EventEmitter = require("events");
const logger = require("../logwrapper");
const profileManager = require("../common/profile-manager");
const frontendCommunicator = require("../common/frontend-communicator");
const twitchApi = require("../twitch-api/api");

const getKolPollsDb = () => profileManager.getJsonDbInProfile("kolPolls");

/**@extends {NodeJS.EventEmitter} */
class KolPollAccess extends EventEmitter {

    constructor() {
        super();
        this._kol_polls = {};
    }

    getKolPolls() {
        return Object.values(this._kol_polls);
    }

    getKolPoll(kolPollId) {
        return this.getKolPolls().find(t => t.kolPollId === kolPollId);
    }

    loadKolPolls() {
        logger.debug(`Attempting to load KolPolls...`);

        const KolPollsDb = getKolPollsDb();

        try {
            const KolPollData = KolPollsDb.getData("/");

            if (KolPollData) {
                twitchApi.kolPolls.getKolPolls().then((runningPolls) => {
                    // 第一次打开时清空是否激活的状态
                    for (let id in KolPollData) {
                        if (KolPollData.hasOwnProperty(id)) {
                            KolPollData[id].is_active = false;
                        }
                    }
                    if (runningPolls) {
                        runningPolls.forEach((poll) => {
                            let pollId = poll.id;
                            for (let id in KolPollData) {
                                if (KolPollData[id].hasOwnProperty("twitchPoll") && KolPollData[id].twitchPoll.id === pollId && poll.status === 'ACTIVE') {
                                    KolPollData[id].is_active = true;
                                    KolPollData[id].twitchPoll.status = 'ACTIVE';
                                    KolPollData[id].started_at = poll.started_at;
                                }
                            }
                        });
                        this._kol_polls = KolPollData;
                        frontendCommunicator.send("kolPollSync");
                    }
                    this._kol_polls = KolPollData;
                });
            }

            logger.debug(`Loaded KolPolls.`);

        } catch (err) {
            logger.warn(`There was an error reading KolPolls file.`, err);
        }
    }

    appendTwitchPollToLocal(kolPoll, twitchKolPoll, emitUpdateEventToFrontEnd = true) {
        if (twitchKolPoll == null || kolPoll == null) return;

        kolPoll.twitchPoll = twitchKolPoll;
        kolPoll.is_active = twitchKolPoll.status === "ACTIVE";
        this._kol_polls[kolPoll.id] = kolPoll;

        try {
            const kolPollDb = getKolPollsDb();

            kolPollDb.push("/" + kolPoll.id, kolPoll);

            logger.debug(`Updated kolPoll ${kolPoll.id} to file.`);

            if (emitUpdateEventToFrontEnd) {
                frontendCommunicator.send("kolPollUpdate", kolPoll);
            }

            this.emit("kolPoll-updated", kolPoll);
        } catch (err) {
            logger.warn(`There was an error saving an kolPoll.`, err);
        }
    }

    saveKolPoll(kolPoll, emitUpdateEventToFrontEnd = true) {
        if (kolPoll == null) return;

        this._kol_polls[kolPoll.id] = kolPoll;

        try {
            const kolPollDb = getKolPollsDb();

            kolPollDb.push("/" + kolPoll.id, kolPoll);

            logger.debug(`Saved kolPoll ${kolPoll.id} to file.`);

            if (emitUpdateEventToFrontEnd) {
                frontendCommunicator.send("kolPollUpdate", kolPoll);
            }

            this.emit("kolPoll-save", kolPoll);
        } catch (err) {
            logger.warn(`There was an error saving an kolPoll.`, err);
        }
    }

    deleteKolPoll(kolPollId) {
        if (kolPollId == null) return;

        delete this._kol_polls[kolPollId];

        try {
            const KolPollDb = getKolPollsDb();

            KolPollDb.delete("/" + kolPollId);

            logger.debug(`Deleted KolPoll: ${kolPollId}`);

            this.emit("KolPoll-delete", kolPollId);
        } catch (err) {
            logger.warn(`There was an error deleting a KolPoll.`, err);
        }
    }
}

const kolPollAccess = new KolPollAccess();

frontendCommunicator.onAsync("getKolPolls", async () => kolPollAccess.getKolPolls());

frontendCommunicator.onAsync("beginKolPoll", async (KolPoll) => {
    // kolPollAccess.beginKolPoll(KolPoll, false);
    let kolPoll = JSON.parse(JSON.stringify(KolPoll));
    let tempChoices = [];
    kolPoll.choices.map(item => tempChoices.push({ title: item.title }));
    try {
        let response = await twitchApi.kolPolls.createKolPoll(kolPoll.title, kolPoll.duration, tempChoices);
        logger.debug(`the response of the quest` + response);
        //更新从twitch获取到的投票信息到数据库
        kolPollAccess.appendTwitchPollToLocal(kolPoll, response);
        return {
            type: 'success',
            data: null
        };
    } catch (error) {
        logger.warn('Error begin the poll: ', error);
        return {
            type: 'error',
            data: error
        };
    }
});

frontendCommunicator.onAsync("endKolPoll", async (KolPoll) => {
    let kolPoll = JSON.parse(JSON.stringify(KolPoll));
    try {
        let response = await twitchApi.kolPolls.endKolPoll(kolPoll.twitchPoll.id);
        logger.debug(`end the kol poll` + response);
        //更新从twitch获取到的投票信息到数据库
        kolPollAccess.appendTwitchPollToLocal(kolPoll, response);
        return {
            type: 'success',
            data: null
        };
    } catch (error) {
        logger.warn('Error end the poll: ', error);
        return {
            type: 'error',
            data: error
        };
    }
});

frontendCommunicator.on("saveKolPoll", (KolPoll) => {
    kolPollAccess.saveKolPoll(KolPoll, false);
});

frontendCommunicator.on("deleteKolPoll", (KolPollId) => {
    kolPollAccess.deleteKolPoll(KolPollId);
});

frontendCommunicator.onAsync("viewKolPoll", async (twitchPollId) => {
    let response = await twitchApi.kolPolls.getKolPollById(twitchPollId);
    // backendCommunicator.fireEventAsync("get-twitch-poll-result", response)
    return response;
});

module.exports = kolPollAccess;
