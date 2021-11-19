"use strict";

const electron = require("electron");
const { BrowserWindow, BrowserView, Menu, shell } = electron;
const path = require("path");
const url = require("url");
const windowStateKeeper = require("electron-window-state");
const fileOpenHelpers = require("../file-open-helpers");
const frontendCommunicator = require("../../common/frontend-communicator");

/**
 * Twitchbot's main window
 * Keeps a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 *@type {Electron.BrowserWindow}
 */
exports.mainWindow = null;

/**
 * The splashscreen window.
 *@type {Electron.BrowserWindow}
 */
let splashscreenWindow;


function createMainWindow() {
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1280,
        defaultHeight: 720
    });

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        minWidth: 300,
        minHeight: 50,
        icon: path.join(__dirname, "../../../gui/images/logo_transparent_2.png"),
        show: false,
        titleBarStyle: "hiddenInset",
        backgroundColor: "#1E2023",
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            nativeWindowOpen: false,
            backgroundThrottling: false
        }
    });

    mainWindow.webContents.on('new-window',
        (event, _url, frameName, _disposition, options) => {
            if (frameName === 'modal') {
                // open window as modal
                event.preventDefault();
                Object.assign(options, {
                    frame: true,
                    titleBarStyle: "default",
                    parent: mainWindow,
                    width: 250,
                    height: 400,
                    javascript: false,
                    webPreferences: {
                        webviewTag: true
                    }

                });
                event.newGuest = new BrowserWindow(options);
            }
        });

    //set a global reference, lots of backend files depend on this being available globally
    exports.mainWindow = mainWindow;
    global.renderWindow = mainWindow;

    const frontendCommunicator = require("../../common/frontend-communicator");
    const menuTemplate = [
        {
            label: 'Edit',
            submenu: [
                {
                    role: 'cut'
                },
                {
                    role: 'copy'
                },
                {
                    role: 'paste'
                },
                {
                    role: "undo"
                },
                {
                    role: "redo"
                },
                {
                    role: "selectAll"
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                {
                    role: 'minimize'
                },
                {
                    role: 'close'
                },
                {
                    role: 'quit'
                },
                {
                    type: 'separator'
                },
                {
                    role: 'toggledevtools'
                }
            ]
        },
        {
            role: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        frontendCommunicator.send("open-about-modal");
                    }
                }
            ]
        }
    ];

    // 打包后不展示菜单栏
    const menu = electron.app.isPackaged ? null : Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(mainWindow);

    // and load the index.html of the app.
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "../../../gui/app/index.html"),
            protocol: "file:",
            slashes: true
        })
    );

    // wait for the main window's content to load, then show it
    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.show();
        if (splashscreenWindow) {
            splashscreenWindow.destroy();
        }

        const startupScriptsManager = require("../../common/handlers/custom-scripts/startup-scripts-manager");
        startupScriptsManager.runStartupScripts();

        const eventManager = require("../../events/EventManager");
        eventManager.triggerEvent("twitcherbot", "twitcherbot-started", {
            username: "Twitchbot"
        });

        fileOpenHelpers.setWindowReady(true);
    });

    mainWindow.webContents.on('new-window', function (e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });
}

/**
 * Creates the splash screen
 */
function createSplashScreen() {
    const isLinux = process.platform !== 'win32' && process.platform !== 'darwin';
    const splash = new BrowserWindow({
        width: 240,
        height: 325,
        icon: path.join(__dirname, "../../../gui/images/logo_transparent_2.png"),
        transparent: !isLinux,
        backgroundColor: isLinux ? "#34363C" : undefined,
        frame: false,
        closable: false,
        fullscreenable: false,
        movable: false,
        resizable: false,
        center: true,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });
    splashscreenWindow = splash;

    splash.on("ready-to-show", () => {
        splash.show();
    });

    return splash.loadURL(
        url.format({
            pathname: path.join(__dirname, "../../../gui/splashscreen/splash.html"),
            protocol: "file:",
            slashes: true
        }));
}

/**
 * Twitchbot's main window
 * Keeps a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 *@type {Electron.BrowserWindow}
 */
let streamPreview = null;

function createStreamPreviewWindow() {

    if (streamPreview != null && !streamPreview.isDestroyed()) {
        if (streamPreview.isMinimized()) {
            streamPreview.restore();
        }
        streamPreview.focus();
        return;
    }

    const accountAccess = require("../../common/account-access");
    const streamer = accountAccess.getAccounts().streamer;

    if (!streamer.loggedIn) return;

    const streamPreviewWindowState = windowStateKeeper({
        defaultWidth: 815,
        defaultHeight: 480,
        file: "stream-preview-window-state.json"
    });

    streamPreview = new BrowserWindow({
        frame: true,
        alwaysOnTop: true,
        backgroundColor: "#1E2023",
        title: "Stream Preview",
        parent: exports.mainWindow,
        width: streamPreviewWindowState.width,
        height: streamPreviewWindowState.height,
        x: streamPreviewWindowState.x,
        y: streamPreviewWindowState.y,
        javascript: false,
        webPreferences: {}
    });

    const view = new BrowserView();
    streamPreview.setBrowserView(view);
    view.setBounds({
        x: 0,
        y: 0,
        width: streamPreviewWindowState.width,
        height: streamPreviewWindowState.height - 10
    });
    view.setAutoResize({
        width: true,
        height: true
    });
    view.webContents.on('new-window', (vEvent) => {
        vEvent.preventDefault();
    });

    view.webContents.loadURL(`https://player.twitch.tv/?channel=${streamer.username}&parent=twitcherbot&muted=true`);

    streamPreviewWindowState.manage(streamPreview);

    streamPreview.on("close", () => {
        if (!view.isDestroyed()) {
            view.destroy();
        }
    });
}

let twitchLoginScreen = null;

function createTwitchLoginScreen(url) {

    if (twitchLoginScreen != null && !twitchLoginScreen.isDestroyed()) {
        if (twitchLoginScreen.isMinimized()) {
            twitchLoginScreen.restore();
        }
        twitchLoginScreen.focus();
        return;
    }

    const accountAccess = require("../../common/account-access");
    const streamer = accountAccess.getAccounts().streamer;

    if (streamer.loggedIn) return;


    twitchLoginScreen = new BrowserWindow({
        frame: true,
        backgroundColor: "#1E2023",
        title: "Twitch Login",
        parent: exports.mainWindow,
        minimizable: false,
        maximizable: false,
        width: 880,
        height: 480,
        javascript: false,
        webPreferences: {}
    });

    const view = new BrowserView();
    twitchLoginScreen.setBrowserView(view);
    view.setBounds({
        x: 0,
        y: 0,
        width: 880,
        height: 470
    });
    view.setAutoResize({
        width: true,
        height: true
    });
    view.webContents.on('new-window', (event, _url) => {
        event.preventDefault();
        shell.openExternal(_url);
    });

    view.webContents.loadURL(url);
    exports.twitchLoginScreen = twitchLoginScreen;
    
    twitchLoginScreen.on("close", () => {
        if (!view.isDestroyed()) {
            view.destroy();
        }
    });
}

let chatBox = null;

function createChatBoxWindow() {

    if (chatBox != null && !chatBox.isDestroyed()) {
        if (chatBox.isMinimized()) {
            chatBox.restore();
        }
        chatBox.focus();
        return;
    }

    // Create the browser window.
    chatBox = new BrowserWindow({
        width: 600,
        height: 900,
        title: "Chat Feed",
        backgroundColor: "#222629",
        titleBarStyle: "hiddenInset",
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            nativeWindowOpen: false,
            backgroundThrottling: false
        }
    });

    chatBox.loadURL(
        url.format({
            pathname: path.join(__dirname, "../../../gui/app/kol-chat-box.html"),
            protocol: "file:",
            slashes: true
        })
    );

    chatBox.on("close", () => {
        frontendCommunicator.send("closePopChatBox");
    });

    exports.chatBox = chatBox;
}

exports.createStreamPreviewWindow = createStreamPreviewWindow;
exports.createMainWindow = createMainWindow;
exports.createSplashScreen = createSplashScreen;
exports.createTwitchLoginScreen = createTwitchLoginScreen;
exports.createChatBoxWindow = createChatBoxWindow;