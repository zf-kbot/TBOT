"use strict";

(function() {

    const uuid = require("uuid");

    angular
        .module('twitcherbotApp')
        .component("twitcherbotInput", {
            bindings: {
                inputTitle: "@",
                placeholderText: "@",
                inputType: "@",
                dataType: "@?",
                useTextArea: "<",
                disableVariables: "<",
                onInputUpdate: "&",
                model: "=",
                style: "@",
                onClick: "&"
            },
            template: `
                <div style="{{$ctrl.style}}">
                    <div ng-if="$ctrl.useInputGroup" class="input-group">
                        <span class="input-group-addon" id="{{$ctrl.inputGroupId}}">{{$ctrl.inputTitle}}</span>
                        <input ng-if="!$ctrl.useTextArea" type="{{$ctrl.disableVariables ? $ctrl.inputType || 'text' : 'text'}}" class="form-control input-group-bgcolor" ng-model="$ctrl.model" ng-change="$ctrl.save($ctrl.model)" placeholder="{{$ctrl.placeholderText}}"  replace-variables="{{$ctrl.dataType}}" disable-variable-menu="$ctrl.disableVariables" style="border-radius: 5px">
                        <textarea ng-if="$ctrl.useTextArea" ng-model="$ctrl.model" ng-change="$ctrl.onChange($ctrl.model)" class="form-control input-group-bgcolor" placeholder="{{$ctrl.placeholderText}}" rows="4" cols="40"  replace-variables="{{$ctrl.dataType}}" disable-variable-menu="$ctrl.disableVariables"></textarea>
                    </div>

                    <div ng-if="!$ctrl.useInputGroup">
                        <input ng-if="!$ctrl.useTextArea" type="{{$ctrl.disableVariables ? $ctrl.inputType || 'text' : 'text'}}" class="form-control" ng-model="$ctrl.model" ng-change="$ctrl.onChange($ctrl.model)" placeholder="{{$ctrl.placeholderText}}"  replace-variables="{{$ctrl.dataType}}" disable-variable-menu="$ctrl.disableVariables" ng-click="$ctrl.onClick()">
                        <textarea ng-if="$ctrl.useTextArea" ng-model="$ctrl.model" ng-change="$ctrl.onChange($ctrl.model)" class="form-control" placeholder="{{$ctrl.placeholderText}}" rows="4" cols="40" replace-variables="{{$ctrl.dataType}}" disable-variable-menu="$ctrl.disableVariables"></textarea>
                    </div>

                </div>
            `,
            controller: function($timeout) {
                const $ctrl = this;

                $ctrl.inputGroupId = uuid();
                //firebot-input输入框防抖
                $ctrl.save = kolDebounce((model) => {
                    $ctrl.model = model;
                    $timeout(() => {
                        console.info(model);
                        $ctrl.onInputUpdate();
                    }, 25);
                }, 2000);

                $ctrl.onChange = (model) => {
                    $ctrl.model = model;
                    $timeout(() => {
                        $ctrl.onInputUpdate();
                    }, 25);
                };

                $ctrl.$onInit = () => {
                    $ctrl.useInputGroup = $ctrl.inputTitle != null && $ctrl.inputTitle !== '';
                };
            }
        });
}());
