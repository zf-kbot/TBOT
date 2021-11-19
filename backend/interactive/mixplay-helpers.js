"use strict";


function mapMixplayControl(twitcherbotControl) {
    let mixplayControl = twitcherbotControl.mixplay;

    mixplayControl.controlID = twitcherbotControl.id;
    mixplayControl.kind = twitcherbotControl.kind;
    if (twitcherbotControl.position != null) {
        mixplayControl.position = twitcherbotControl.position;
    }
    if (twitcherbotControl.active != null) {
        mixplayControl.disabled = !twitcherbotControl.active;
    }

    //if text size is just a number, append "px"
    if (mixplayControl.textSize !== null && mixplayControl.textSize !== undefined) {
        if (!isNaN(mixplayControl.textSize)) {
            mixplayControl.textSize += "px";
        }
    }

    if (mixplayControl.backgroundImage != null) {
        mixplayControl.backgroundImage = mixplayControl.backgroundImage.trim();
    }

    if (mixplayControl.progress != null) {
        let progress = mixplayControl.progress.toString().replace("%", "").trim();
        if (isNaN(progress)) {
            mixplayControl.progress = undefined;
        } else {
            mixplayControl.progress = Number(progress) / 100;
        }
    }

    return mixplayControl;
}

function mapMixplayScene(twitcherbotScene, id) {
    let mixplayScene = {
        sceneID: id,
        controls: []
    };

    if (twitcherbotScene.controls) {
        for (let fbControl of twitcherbotScene.controls) {
            let mixplayControl = mapMixplayControl(fbControl);
            mixplayScene.controls.push(mixplayControl);
        }
    }

    return mixplayScene;
}

function buildMixplayModelFromProject(project) {
    //copy the scenes to avoid issues with references
    let twitcherbotScenes = JSON.parse(JSON.stringify(project.scenes));

    let defaultScene;
    let otherScenes = [];
    for (let fbScene of twitcherbotScenes) {
        if (fbScene.id === project.defaultSceneId) {
            defaultScene = mapMixplayScene(fbScene, 'default');
        } else {
            otherScenes.push(mapMixplayScene(fbScene, fbScene.id));
        }
    }

    return {
        id: project.id,
        defaultScene: defaultScene,
        otherScenes: otherScenes,
        groups: []
    };
}

exports.mapMixplayControl = mapMixplayControl;
exports.buildMixplayModelFromProject = buildMixplayModelFromProject;