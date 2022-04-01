"use strict";

const { checkForTwitchbotSetupPath } = require("../../file-open-helpers");

exports.whenReady = async () => {
    const logger = require("../../../logwrapper");

    checkForTwitchbotSetupPath(process.argv);

    const windowManagement = require("../window-management");

    logger.debug("Showing splash screen...");
    await windowManagement.createSplashScreen();

    // Ensure required folders are created
    const { ensureRequiredFoldersExist } = require("../../data-tasks");
    ensureRequiredFoldersExist();

    // load twitch auth
    require("../../../auth/auth-manager");
    const twitchAuth = require("../../../auth/twitch-auth");
    twitchAuth.registerTwitchAuthProviders();

    // load accounts
    const accountAccess = require("../../../common/account-access");
    await accountAccess.updateAccountCache(false);

    const connectionManager = require("../../../common/connection-manager");
    connectionManager.startOnlineCheckInterval();

    const timerAccess = require("../../../timers/timer-access");
    timerAccess.loadTimers();

    const timerManager = require("../../../timers/timer-manager");
    timerManager.startTimers();

    const twitchClient = require("../../../twitch-api/client");
    twitchClient.setupTwitchClients();

    const twitchFrontendListeners = require("../../../twitch-api/frontend-twitch-listeners");
    twitchFrontendListeners.setupListeners();

    // load effects
    logger.debug("Loading effects...");
    const { loadEffects } = require("../../../effects/builtInEffectLoader");
    loadEffects();

    // load commands
    logger.debug("Loading sys commands...");
    const { loadCommands } = require("../../../chat/commands/systemCommandLoader");
    loadCommands();

    // load event sources
    logger.debug("Loading event sources...");
    const { loadEventSources, loadEventFilters } = require("../../../events/builtinEventSourceLoader");
    loadEventSources();
    loadEventFilters();

    // load event filters
    logger.debug("Loading event filters...");
    const { loadFilters } = require("../../../events/filters/builtin-filter-loader");
    loadFilters();

    // load integrations
    logger.debug("Loading integrations...");
    const { loadIntegrations } = require("../../../integrations/integrationLoader");
    loadIntegrations();

    // load variables
    logger.debug("Loading variables...");
    const { loadReplaceVariables } = require("../../../variables/builtin-variable-loader");
    loadReplaceVariables();

    // load restrictions
    logger.debug("Loading restrictions...");
    const { loadRestrictions } = require("../../../restrictions/builtin-restrictions-loader");
    loadRestrictions();

    const fontManager = require("../../../fontManager");
    fontManager.generateAppFontCssFile();

    const eventsAccess = require("../../../events/events-access");
    eventsAccess.loadEventsAndGroups();

    const customRolesManager = require("../../../roles/custom-roles-manager");
    customRolesManager.loadCustomRoles();

    const effectQueueManager = require("../../../effects/queues/effect-queue-manager");
    effectQueueManager.loadEffectQueues();

    const presetEffectListManager = require("../../../effects/preset-lists/preset-effect-list-manager");
    presetEffectListManager.loadPresetEffectLists();

    const startupScriptsManager = require("../../../common/handlers/custom-scripts/startup-scripts-manager");
    startupScriptsManager.loadStartupConfig();

    //检测默认黑名单词汇是否存在
    const kolSource = require("../../../common/kol-source");
    kolSource.loadDefaultBlacklistedWords();

    const chatModerationManager = require("../../../chat/moderation/chat-moderation-manager");
    chatModerationManager.load();

    const countersManager = require("../../../counters/counter-manager");
    countersManager.loadCounters();

    const gamesManager = require("../../../games/game-manager");
    gamesManager.loadGameSettings();

    const builtinGameLoader = require("../../../games/builtin-game-loader");
    builtinGameLoader.loadGames();

    const { settings } = require("../../../common/settings-access");
    if (settings.getPersistCustomVariables()) {
        const customVariableManager = require("../../../common/custom-variable-manager");
        customVariableManager.loadVariablesFromFile();
    }

    // get importer in memory
    const v4Importer = require("../../../import/v4/v4-importer");
    v4Importer.setupListeners();

    const setupImporter = require("../../../import/setups/setup-importer");
    setupImporter.setupListeners();

    const { setupCommonListeners } = require("../../../common/common-listeners");
    setupCommonListeners();

    const hotkeyManager = require("../../../hotkeys/hotkey-manager");
    hotkeyManager.refreshHotkeyCache();

    const currencyManager = require("../../../currency/currencyManager");
    currencyManager.startTimer();

    const kolPollAccess = require("../../../kol-polls/kol-poll-access");
    kolPollAccess.loadKolPolls();

    // Connect to DBs.
    logger.debug("Creating or connecting user database");
    const userdb = require("../../../database/userDatabase");
    userdb.connectUserDatabase();
    // Set users in user db to offline if for some reason they are still set to online. (app crash or something)
    userdb.setAllUsersOffline();
    userdb.setAllUsersOldViewer();

    logger.debug("Creating or connecting stats database");
    const statsdb = require("../../../database/statsDatabase");
    statsdb.connectStatsDatabase();

    logger.debug("Creating or connecting quotes database");
    const quotesdb = require("../../../quotes/quotes-manager");
    quotesdb.loadQuoteDatabase();

    logger.debug("Creating or connecting xpHistory Database");
    const xphistorydb = require("../../../database/xpHistoryDatabase");
    xphistorydb.loadXPHistoryDatabase();

    logger.debug("Creating or connecting userxp database");
    const userxpdb = require("../../../database/userXPDatabase");
    userxpdb.loadUserXPDatabase();
    userxpdb.initAllUserXP();

    logger.debug("Creating or connecting userPoints database");
    const userpointsdb = require("../../../database/userPointsDatabase");
    userpointsdb.loadUserPointsDatabase();

    logger.debug("Creating or connecting gaLivePoints database");
    const galivepointsdb = require("../../../database/gaLivePointsDatabase");
    galivepointsdb.loadGaLivePointsDatabase();

    logger.debug("Creating or connecting chatMessage database");
    const chatmessagedb = require("../../../database/chatMessageDatabase");
    chatmessagedb.loadChatMessageDatabase();

    logger.debug("Creating or connecting punishmentHistory database");
    const punishmenthistorydb = require("../../../database/punishmentHistoryDatabase");
    punishmenthistorydb.loadPunishmentHistoryDatabase();

    logger.debug("Creating or connecting emote database");
    const emotedb = require("../../../database/emoteDatabase");
    emotedb.loadEmoteDatabase();

    logger.debug("Creating or connecting viewTime database");
    const viewtimedb = require("../../../database/viewtimeDatabase");
    viewtimedb.loadViewTimeDatabase();

    logger.debug("Creating or connecting newFollow database");
    const newfollowdb = require("../../../database/newfollowDatabase");
    newfollowdb.loadNewFollowDatabase();

    // These are defined globally for Custom Scripts.
    // We will probably wnat to handle these differently but we shouldn't
    // change anything until we are ready as changing this will break most scripts
    const Effect = require("../../../common/EffectType");
    global.EffectType = Effect.EffectTypeV5Map;
    const profileManager = require("../../../common/profile-manager");
    global.SCRIPTS_DIR = profileManager.getPathInProfile("/scripts/");
    // delete popout chatmsgs
    profileManager.getJsonDbInProfile("/chat/chatQueue").delete("/msgs");

    const backupManager = require("../../../backupManager");
    backupManager.onceADayBackUpCheck();

    // start the REST api server
    const webServer = require("../../../../server/httpServer");
    webServer.start();

    const channelAccess = require("../../../common/channel-access");
    channelAccess.refreshStreamerChannelData();

    const channelRewardManager = require("../../../channel-rewards/channel-reward-manager");
    await channelRewardManager.loadChannelRewards();

    // load activity feed manager
    require("../../../events/activity-feed-manager");

    const streamInfoPoll = require("../../../twitch-api/stream-info-poll");
    streamInfoPoll.startStreamInfoPoll();


    const streamTags = require("../../../twitch-api/stream-tags");
    const streamTagsSource = require("../../../app-management/electron/startup-resource/streamtags.json");
    streamTags.loadStreamTags(streamTagsSource.stream);

    const eventSubClient = require("../../../twitch-api/eventsub/eventsub-client");
    eventSubClient.startListening();

    windowManagement.createMainWindow();

    // forward backend logs to front end
    logger.on("logging", (transport, level, msg, meta) => {
        const mainWindow = windowManagement.mainWindow;
        if (mainWindow != null && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("logging", {
                transport: transport,
                level: level,
                msg: msg,
                meta: meta
            });
        }
    });
};