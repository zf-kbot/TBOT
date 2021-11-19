"use strict";
const logger = require("../../logwrapper");
const uuid = require("uuid/v1");

const api = require("../../api-access");
const { DevLabImportError } = require("../../../shared/errors");

function mapMixPlayControlToTwitchbot(mixPlayControl) {

    // dont support screen/mouse controls at this time
    if (mixPlayControl.kind === "screen") return null;

    let newId = uuid();
    let twitcherbotControl = {
        id: newId,
        name: mixPlayControl.controlID,
        kind: mixPlayControl.kind,
        position: mixPlayControl.position,
        mixplay: {},
        active: true
    };

    let mixPlayControlData = JSON.parse(JSON.stringify(mixPlayControl));
    delete mixPlayControlData["position"];
    delete mixPlayControlData["controlID"];
    delete mixPlayControlData["kind"];

    twitcherbotControl.mixplay = mixPlayControlData;

    return twitcherbotControl;
}

function mapDevLabScenesToTwitchbotProject(devLabScenes, twitcherbotProject) {

    let devlabDefaultScene = devLabScenes.find(s => s.sceneID === "default");
    if (devlabDefaultScene) {
        let defaultSceneId = uuid();
        let defaultScene = {
            id: defaultSceneId,
            name: "default",
            controls: devlabDefaultScene.controls.map(mapMixPlayControlToTwitchbot).filter(c => c != null)
        };
        twitcherbotProject.scenes.push(defaultScene);
        twitcherbotProject.defaultSceneId = defaultSceneId;

        devLabScenes = devLabScenes.filter(s => s.sceneID !== "default");
    }

    for (let devLabScene of devLabScenes) {
        let newSceneId = uuid();
        let newScene = {
            id: newSceneId,
            name: devLabScene.sceneID,
            controls: devLabScene.controls.map(mapMixPlayControlToTwitchbot).filter(c => c != null)
        };
        twitcherbotProject.scenes.push(newScene);
    }

    //ensure we at least have one scene
    if (twitcherbotProject.scenes.length < 1) {
        let mainScene = {
            id: uuid(),
            name: "Main",
            controls: []
        };
        twitcherbotProject.scenes.push(mainScene);
    }

    //ensure a default scene id is set
    if (twitcherbotProject.defaultSceneId == null) {
        twitcherbotProject.defaultSceneId = twitcherbotProject.scenes[0].id;
    }

    return twitcherbotProject;
}

async function importDevLabProject(devLabId, projectName) {

    let devlabProject;
    try {
        devlabProject = await api.get(`interactive/versions/${devLabId}`, "v1", false, false);
    } catch (err) {
        logger.warn("Error while attempting to import devlab provject", err);
        throw new DevLabImportError("Could not find DevLab project.");
    }

    if (devlabProject == null || devlabProject.controls == null || devlabProject.controls.scenes == null) {
        throw new DevLabImportError("DevLab project appears to be invalid.");
    }

    let devLavProjectName = devlabProject.game && devlabProject.game.name ? devlabProject.game.name : "Imported DevLab Project";

    let now = new Date();
    let newProjectId = now.getTime().toString();

    let newProject = {
        id: newProjectId,
        name: projectName != null && projectName !== "" ? projectName : devLavProjectName,
        createdAt: now,
        defaultSceneId: null,
        scenes: []
    };

    let devLabScenes = devlabProject.controls.scenes;

    mapDevLabScenesToTwitchbotProject(devLabScenes, newProject);

    return newProject;
}

exports.importDevLabProject = importDevLabProject;
exports.mapDevLabScenesToTwitchbotProject = mapDevLabScenesToTwitchbotProject;