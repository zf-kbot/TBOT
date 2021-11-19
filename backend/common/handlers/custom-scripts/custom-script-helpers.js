"use strict";
const twitchChat = require('../../../chat/twitch-chat');
const profileManager = require("../../profile-manager");
const settings = require('../../settings-access').settings;
const path = require('path');
const logger = require('../../../logwrapper');
const {
    app
} = require('electron');

const accountAccess = require('../../account-access');

//v4 effect types are keys, supported v5 types are values
const v4EffectTypeMap = {
    "API Button": "twitcherbot:api",
    "Celebration": "twitcherbot:celebration",
    "Change Group": null,
    "Change Scene": null,
    "Chat": "twitcherbot:chat",
    "Cooldown": null,
    "Custom Script": "twitcherbot:customscript",
    "Run Command": null,
    "Delay": "twitcherbot:delay",
    "Dice": "twitcherbot:dice",
    "Game Control": "twitcherbot:controlemulation",
    "HTML": "twitcherbot:html",
    "Show Event": null,
    "Play Sound": "twitcherbot:playsound",
    "Random Effect": "twitcherbot:randomeffect",
    "Effect Group": "twitcherbot:run-effect-list",
    "Show Image": "twitcherbot:showImage",
    "Create Clip": "twitcherbot:clip",
    "Show Video": "twitcherbot:playvideo",
    "Clear Effects": null,
    "Write Text To File": "twitcherbot:filewriter",
    "Group List": null,
    "Scene List": null,
    "Command List": null,
    "Change User Scene": null,
    "Change Group Scene": null,
    "Update Button": null,
    "Toggle Connection": "twitcherbot:toggleconnection",
    "Show Text": "twitcherbot:showtext"
};

function mapV4EffectToV5(effect) {
    if (effect && effect.type) {
        const mappedType = v4EffectTypeMap[effect.type];
        if (mappedType != null) {
            effect.type = mappedType;
        }
    }
    return effect;
}

function buildModules(scriptManifest) {
    const streamerName = accountAccess.getAccounts().streamer.username || "Unknown Streamer";
    const appVersion = app.getVersion();

    const request = require("request");

    const customRequest = request.defaults({
        headers: {
            'User-Agent': `Twitchbot/${appVersion};CustomScript/${scriptManifest.name}/${scriptManifest.version};User/${streamerName}`
        }
    });

    // safe guard: enforce our user-agent
    customRequest.init = function init(options) {
        if (options != null && options.headers != null) {
            delete options.headers['User-Agent'];
        }
        customRequest.prototype.init.call(this, options);
    };

    return {
        request: customRequest,
        spawn: require('child_process').spawn,
        childProcess: require('child_process'),
        fs: require('fs-extra'),
        path: require('path'),
        JsonDb: require('node-json-db'),
        moment: require('moment'),
        howler: require("howler"),
        logger: logger,
        // thin chat shim for basic backwards compatibility
        chat: {
            smartSend: (...args) => {
                twitchChat.sendChatMessage(...args);
            },
            deleteChat: (id) => {
                twitchChat.deleteMessage(id);
            }
        },
        twitchChat: twitchChat,
        twitchApi: require("../../../twitch-api/api"),
        httpServer: require("../../../../server/httpServer"),
        effectManager: require("../../../effects/effectManager"),
        conditionManager: require("../../../effects/builtin/conditional-effects/conditions/condition-manager"),
        restrictionManager: require("../../../restrictions/restriction-manager"),
        commandManager: require("../../../chat/commands/CommandManager"),
        eventManager: require("../../../events/EventManager"),
        eventFilterManager: require("../../../events/filters/filter-manager"),
        replaceVariableManager: require("../../../variables/replace-variable-manager"),
        integrationManager: require("../../../integrations/IntegrationManager"),
        customVariableManager: require("../../../common/custom-variable-manager"),
        customRolesManager: require("../../../roles/custom-roles-manager"),
        twitcherbotRolesManager: require("../../../roles/twitcherbot-roles-manager"),
        timerManager: require("../../../timers/timer-manager"),
        gameManager: require("../../../games/game-manager"),
        currencyManager: require("../../../currency/currencyManager"),
        currencyDb: require("../../../database/currencyDatabase"),
        userDb: require("../../../database/userDatabase"),
        quotesManager: require("../../../quotes/quotes-manager"),
        frontendCommunicator: require("../../frontend-communicator"),
        counterManager: require("../../../counters/counter-manager"),
        mixplay: {},
        utils: require("../../../utility")
    };
}


function buildRunRequest(scriptManifest, params, trigger) {
    return {
        modules: buildModules(scriptManifest),
        command: trigger.metadata.userCommand,
        user: {
            name: trigger.metadata.username
        },
        twitcherbot: {
            accounts: accountAccess.getAccounts(),
            settings: settings,
            version: app.getVersion()
        },
        parameters: params,
        trigger: trigger
    };
}

function getScriptPath(scriptName) {
    const scriptsFolder = profileManager.getPathInProfile("/scripts");
    return path.resolve(scriptsFolder, scriptName);
}

function mapParameters(parameterData) {
    //simplify parameters
    const simpleParams = {};
    if (parameterData != null) {
        Object.keys(parameterData).forEach(k => {
            let param = parameterData[k];
            if (param != null) {
                simpleParams[k] = param.value == null && param.value !== ""
                    ? param.default
                    : param.value;
            }
        });
    }
    return simpleParams;
}

exports.mapParameters = mapParameters;
exports.getScriptPath = getScriptPath;
exports.buildRunRequest = buildRunRequest;
exports.mapV4EffectToV5 = mapV4EffectToV5;