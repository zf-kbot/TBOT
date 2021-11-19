"use strict";
const logger = require("../logwrapper");
const twitchAuth = require("../auth/twitch-auth");
const accountAccess = require("../common/account-access");
const { session } = require('electron');
const { ApiClient } = require('twitch');

/**@type {ApiClient} */
let client;

/**@type {ApiClient} */
let botClient;

function setupTwitchClients() {

    client = null;
    botClient = null;

    logger.info("Setting up twitch clients...");

    const streamer = accountAccess.getAccounts().streamer;
    if (!streamer.loggedIn) {
        logger.info("Unable to setup twitch clients as streamer account is not logged in.");
        return;
    }

    client = ApiClient.withCredentials(
        twitchAuth.TWITCH_CLIENT_ID,
        streamer.auth.access_token,
        undefined,
        {
            clientSecret: twitchAuth.TWITCH_CLIENT_SECRET,
            refreshToken: streamer.auth.refresh_token,
            expiry: streamer.auth.expires_at != null ? new Date(streamer.auth.expires_at) : undefined,

            onRefresh: (token) => {

                logger.debug("Persisting streamer access token");

                const streamer = accountAccess.getAccounts().streamer;

                const auth = streamer.auth || {};
                auth.access_token = token.accessToken; // eslint-disable-line camelcase
                auth.refresh_token = token.refreshToken; // eslint-disable-line camelcase
                auth.expires_at = token.expiryDate; // eslint-disable-line camelcase
                streamer.auth = auth;

                accountAccess.updateAccount("streamer", streamer, false);
            }
        }
    );

    logger.info("Successfully setup streamer Twitch client");

    const bot = accountAccess.getAccounts().bot;
    if (!bot.loggedIn) {
        logger.info("Unable to setup bot twitch client as bot account is not logged in.");
        return;
    }

    botClient = ApiClient.withCredentials(
        twitchAuth.TWITCH_CLIENT_ID,
        bot.auth.access_token,
        undefined,
        {
            clientSecret: twitchAuth.TWITCH_CLIENT_SECRET,
            refreshToken: bot.auth.refresh_token,
            expiry: bot.auth.expires_at != null ? new Date(bot.auth.expires_at) : undefined,
            onRefresh: (token) => {

                logger.debug("Persisting bot access token");

                const botAccount = accountAccess.getAccounts().bot;

                const auth = botAccount.auth || {};
                auth.access_token = token.accessToken; // eslint-disable-line camelcase
                auth.refresh_token = token.refreshToken; // eslint-disable-line camelcase
                auth.expires_at = token.expiryDate; // eslint-disable-line camelcase
                auth.scope = token.scope;
                botAccount.auth = auth;

                accountAccess.updateAccount("bot", botAccount, false);
            }
        }
    );

    logger.info("Successfully setup bot Twitch client");
}

let clearLoginSession = (param = {}) => {
    // 查询所有 cookies。删除。
    session.defaultSession.cookies.get(param)
        .then((cookies) => {
            cookies.forEach(cookie => {
                let url = '';
                // get prefix, like https://www.
                url += cookie.secure ? 'https://' : 'http://';
                url += cookie.domain.charAt(0) === '.' ? 'www' : '';
                // append domain and path
                url += cookie.domain;
                url += cookie.path;
                logger.info("removing cookie: ", url, cookie.name);
                session.defaultSession.cookies.remove(url, cookie.name, (error) => {
                    if (error) logger.error(`error removing cookie ${cookie.name}`, error);
                });
            });
        }).catch((error) => {
            logger.error(error);
        });
};

accountAccess.events.on("account-update", cache => {
    setupTwitchClients();
    if (!cache.streamer.loggedIn) {
        clearLoginSession({ url: 'https://www.twitch.tv/'});
        require('../common/connection-manager').disconnectSidebarControlledServices();
    } else {
        require('../twitch-api/eventsub/eventsub-client').startListening();
    }
});

exports.setupTwitchClients = setupTwitchClients;
exports.getClient = () => client;
exports.getBotClient = () => botClient;