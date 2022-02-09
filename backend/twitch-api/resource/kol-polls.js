"use strict";

const twitchApi = require("../client");
const { TwitchAPICallType } = require('twitch/lib');
// const { KolPollStatus } = require('./kol-polls');
const accountAccess = require("../../common/account-access");
const { snakeKeys } = require('js-convert-case');
const logger = require('../../logwrapper');

/**
 * @typedef TwitchKolPollChoice
 * @property {string} id ID for the choice.
 * @property {string} title Text displayed for the choice.
 * @property {number} votes Total number of votes received for the choice across all methods of voting.
 * @property {number} channel_points_votes 	Number of votes received via Channel Points.
 * @property {number} bits_votes Number of votes received via Bits.
 */

/**
 * @typedef TwitchKolPollInfomation
 * @property {string} id ID of a poll. Filters results to one or more specific polls. Not providing one or more IDs will return the full list of polls for the authenticated channel.
 * @property {string} broadcaster_id Twitch User ID of this channel owner
 * @property {string} broadcaster_name Name of the broadcaster.
 * @property {string} broadcaster_login Login of the broadcaster.
 * @property {string} title Question displayed for the poll.
 * @property {TwitchKolPollChoice[]} choices Array of the poll choices.
 * @property {boolean} bits_voting_enabled Indicates if Bits can be used for voting.
 * @property {number} bits_per_vote Number of Bits required to vote once with Bits.
 * @property {boolean} channel_points_voting_enabled Indicates if Channel Points can be used for voting.
 * @property {number} channel_points_per_vote Number of Channel Points required to vote once with Channel Points.
 * @property {string} status Poll status. Valid values are:
                                    ACTIVE: Poll is currently in progress.
                                    COMPLETED: Poll has reached its ended_at time.
                                    TERMINATED: Poll has been manually terminated before its ended_at time.
                                    ARCHIVED: Poll is no longer visible on the channel.
                                    MODERATED: Poll is no longer visible to any user on Twitch.
                                    INVALID: Something went wrong determining the state.
 * @property {number} duration Total duration for the poll (in seconds).
 * @property {string} started_at UTC timestamp for the poll’s start time.
 * @property {string} ended_at UTC timestamp for the poll’s end time. Set to null if the poll is active.
 */

/**
 * 获取投票信息集合
 * @param {string} [id] 投票的id
 * @returns {Promise<TwitchKolPollInfomation>}
 */
async function getKolPolls(id = undefined, after = undefined, first = undefined) {

    const client = twitchApi.getClient();
    try {
        const response = await client.callAPI({
            type: TwitchAPICallType.Helix,
            url: "polls",
            method: "GET",
            query: {
                "broadcaster_id": accountAccess.getAccounts().streamer.userId,
                "id": id,
                "after": after,
                "first": first
            }
        });
        if (response == null || response.data == null || response.data.length < 1) {
            return null;
        }
        /**@type {TwitchKolPollInfomation} */
        return response.data;
    } catch (error) {
        logger.error("Failed to get kol poll info", error);
        return null;
    }
}

/**
 * 根据投票id获取指定投票信息
 * @returns {Promise<TwitchChannelInformation>}
 */
async function getKolPollById(id) {
    const client = twitchApi.getClient();
    try {
        const response = await client.callAPI({
            type: TwitchAPICallType.Helix,
            url: "polls",
            method: "GET",
            query: {
                "broadcaster_id": accountAccess.getAccounts().streamer.userId,
                "id": id,
            }
        });
        if (response == null || response.data == null || response.data.length < 1) {
            return null;
        }
        /**@type {TwitchKolPollInfomation} */
        return response.data[0];
    } catch (error) {
        logger.error("Failed to get the target poll info", error);
        return null;
    }
}

/**
 * 创建指定的投票
 */
async function createKolPoll(title, duration, choices = [], bits_voting_enabled = false, bits_per_vote = 0, channel_points_voting_enabled = false, channel_points_per_vote = 0) {
    const client = twitchApi.getClient();
    let postBody = {
        broadcaster_id: accountAccess.getAccounts().streamer.userId,
        title: title,
        duration: duration,
        choices: choices,
        bits_voting_enabled: bits_voting_enabled,
        bits_per_vote: bits_per_vote,
        channel_points_voting_enabled: channel_points_voting_enabled,
        channel_points_per_vote: channel_points_per_vote
    };
    let response = await client.callAPI({
        type: TwitchAPICallType.Helix,
        method: "POST",
        url: "polls",
        body: postBody
    });
    logger.debug(`create poll success`);
    return response.data[0];
}

/**
 * 结束指定的投票
 */
async function endKolPoll(id, status = "TERMINATED") {
    const client = twitchApi.getClient();
    let response = await client.callAPI({
        type: TwitchAPICallType.Helix,
        method: "PATCH",
        url: "polls",
        body: {
            "broadcaster_id": accountAccess.getAccounts().streamer.userId,
            "id": id,
            "status": status,
        }
    });
    logger.debug(`end poll success`);
    return response.data[0];
}

exports.getKolPolls = getKolPolls;
exports.getKolPollById = getKolPollById;
exports.createKolPoll = createKolPoll;
exports.endKolPoll = endKolPoll;