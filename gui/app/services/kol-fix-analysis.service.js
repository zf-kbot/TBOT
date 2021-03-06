"use strict";

(function() {
    angular
        .module("twitcherbotApp")
        .factory("kolFixAnalysisServie", function(
            profileManager, logger
        ) {
            let service = {};
            service.oldData = [];
            service.status = true;

            function getDataFile(filepath) {
                return profileManager.getJsonDbInProfile(filepath);
            }

            function pushDataToFile(filepath, path, data) {
                try {
                    getDataFile(filepath).push(path, data, true);
                } catch (err) { } //eslint-disable-line no-empty
            }

            function saveDataMsg(filepath, path, datamsg) {
                pushDataToFile(filepath, path, datamsg);
            }

            function getDataMsgs(filepath, path) {
                try {
                    let data = getDataFile(filepath).getData(path);
                    return data ? data : [];
                } catch (err) {
                    return [];
                }
            }

            function modifyJosnKey(json, oddkey, newkey) {
                let val = json[oddkey];
                delete json[oddkey];
                json[newkey] = val;
            }
            function getFixAnalysisDataFile() {
                return profileManager.getJsonDbInProfile('/fixanalysisdata');
            }
            function getFixAnanlysisDataMsgs(path) {
                try {
                    let data = getFixAnalysisDataFile().getData(path);
                    return data ? data : 0;
                } catch (err) {
                    return 0;
                }
            }
            function getFixAchievementDataMsgs(path) {
                try {
                    let data = getFixAnalysisDataFile().getData(path);
                    return data ? data : 0;
                } catch (err) {
                    return 0;
                }
            }

            function migratingAchievementFollowerAndNewFollowerData(oldFilePath, newFilePath, path) {
                try {
                    let jsonData = getDataMsgs(oldFilePath, path);
                    for (let key in jsonData) {
                        //????????????????????????
                        saveDataMsg(newFilePath, '/' + key, jsonData[key]);
                    }
                }catch(err) {
                    return {};
                }
            }

            function migratingAchievementMaxViewerData(filePath, path) {
                try {
                    let jsonData = getDataMsgs(filePath, path);
                    let date = '';
                    for(let key in jsonData) {
                        //key??? 2021 9 12???????????????
                        let old_key_array= key.split(' ');
                        let time = old_key_array[0] + '-' + old_key_array[1] +'-' +old_key_array[2];
                        //???????????????0????????????
                        let atTime = new Date(new Date(time).setHours(0, 0, 0, 0)).getTime();
                        let message = {
                            "atTime": atTime,
                            'newViewerNumber': 0,
                            'oldViewerNumber': jsonData[key]
                        }
                        saveDataMsg('/data/achievement/maxviewers', '/' + key, message);
                    }
                } catch(err) {
                    return {};
                }
            }
            function modifyDataFile(filepath, path) {
                try{
                    let jsonData = getDataMsgs(filepath, path);
                    for(let key in jsonData){
                        let old_key_array = key.split(' ');//???????????????
                        if(parseInt(old_key_array[0]) <= 2021 && parseInt(old_key_array[1])< 9 ){//v1.0.2??????????????????2021???9??????????????????????????????????????????1???????????????????????????2021 8 17???
                            old_key_array[1] = parseInt(old_key_array[1])+1;
                            let new_key = old_key_array[0]+ ' '+ old_key_array[1]+ ' '+ old_key_array[2];
                            modifyJosnKey(jsonData, key, new_key);
                        }else{
                            let new_key = key;
                            modifyJosnKey(jsonData, key, new_key);
                            logger.info(key);
                        }
                    }
                    saveDataMsg(filepath, path, jsonData);
                    logger.info(jsonData);
                } catch(err) {
                    return [];
                }
            }
            /*loadModifyAnalysisDataFile????????????2021???9???17??????????????????????????????????????????????????????????????????????????????1???*/
            service.loadModifyAnalysisDataFile = (init = true) => {
                if (!getFixAnanlysisDataMsgs('/version 1.0.3/fixstatus')) {
                    modifyDataFile('/viewdata', '/');
                    modifyDataFile('/totalfollowdata', '/');
                    modifyDataFile('/newfollowdata', '/');
                    modifyDataFile('/newunfollowdata', '/');
                    getFixAnalysisDataFile().push('/version 1.0.3/fixstatus', true, true);
                }

            };
            service.loadMigratingAchievementDataFile = (init = true) => {
                if (!getFixAchievementDataMsgs('/version 1.2.0/fixMigratingData')) {
                    migratingAchievementMaxViewerData('/viewdata', '/');
                    migratingAchievementFollowerAndNewFollowerData('/totalfollowdata', '/data/achievement/follower', '/');
                    migratingAchievementFollowerAndNewFollowerData('/newfollowdata', '/data/achievement/newfollower', '/');
                    getFixAnalysisDataFile().push('/version 1.2.0/fixMigratingData', true, true);
                }
            };

            function pushFixAnalysisDataToFile(path, data) {
                try {
                    getFixAnalysisDataFile().push(path, data, true);
                } catch (err) { } //eslint-disable-line no-empty
            }

            // ???????????????
            function saveFixAnanlysisDataMsg(path, msg) {
                pushFixAnalysisDataToFile(path, msg);
            }

            return service;

        });
}());