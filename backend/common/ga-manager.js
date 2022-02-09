"use strict";

const profileManager = require("../common/profile-manager.js");
const uuid = require("uuid/v4");
const ua = require('universal-analytics');
const logger = require('../logwrapper');
const electron = require("electron");
const EventEmitter = require("events");
const appQuit = new EventEmitter();
const app = electron.app || electron.remote.app;

function getGaErrorFile() {
    return profileManager.getJsonDbInProfile('/gaError');
}
function pushGaErrorDataToFile(path, data) {
    try {
        getGaErrorFile().push(path, data, true);
    } catch (err) { }//eslint-disable-line no-empty
}
function getGoogleAnalyticsCidFile() {
    return profileManager.getJsonDbInProfile('/gaInfo');
}

function pushDataToFile(path, data) {
    try {
        getGoogleAnalyticsCidFile().push(path, data, true);
    } catch (err) { } //eslint-disable-line no-empty
}

function getDataFromFile(path) {
    let data = null;
    try {
        data = getGoogleAnalyticsCidFile().getData(path, true);
    } catch (err) { } //eslint-disable-line no-empty
    return data;
}

function pushGaCid(cid) {
    pushDataToFile('/cid', cid);
}

// 判断是否已有客户id
let cid = getDataFromFile('/cid');
if (!cid) {
    cid = uuid();
    pushGaCid(cid);
}
logger.debug(`ga-cid: ${cid}`);

const uaId = 'UA-131380923-7';
const visitor = ua(uaId, cid);

function sendPageview(url) {
    visitor.pageview(url).send();
}

function sendEvent(category, action, label = '', value = 1) {
    visitor.event(category, action, label, value).send();
}

function checkEnv(func) {
    if (app.isPackaged) {
        return func;
    }
    return () => {};
}
function sendEventAndReturnStatus(category, action, label = '', value = 1) {
    visitor.event(category, action, label, value).send((error) => {
        //写入错误信息
        if (error) {
            pushGaErrorDataToFile('/' + new Date().getTime(), error);
        }
        //ga发送成功，发出退出程序事件
        appQuit.emit("app-quit");
    });
}
exports.sendPageview = checkEnv(sendPageview);
exports.sendEvent = checkEnv(sendEvent);
exports.sendEventAndReturnStatus = checkEnv(sendEventAndReturnStatus);
exports.appQuit = appQuit;