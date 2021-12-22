"use strict";
(function() {
    angular
        .module('twitcherbotApp')
        .component("chatAlert", {
            bindings: {
                message: "<"
            },
            template: `
                <div class="chat-alert">
                    <span style="font-size:25px;margin-right: 10px;"><i class="fa fa-exclamation-circle"></i></span>    
                    <span>{{$ctrl.message}}</span>           
                </div>
            `
        });
}());
