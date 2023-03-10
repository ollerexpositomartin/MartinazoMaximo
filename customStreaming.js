const version = 'v_4.3.11';
const START_CHECK_DELAY = 60000;
const STATS_INTERVAL = 1000;
const BITRATE_STEP = 1000000;
const STEP = 33;
let BROWSER_LAN = window.navigator.language.slice(0, 2);
document.addEventListener("DOMContentLoaded", function () {
    Log.v(`Version ${version}`);
    SessionHandler.setStreamStartTimeout();
    commonView.videoElement = document.getElementById('remotevideo');
    //check hardware
    SYSTEM_STATS.card = SYSTEM_STATS.videoCardInfo();
    const type = SYSTEM_STATS.card.type;
    Log.d(type);
 
    commonView.audioElement = document.getElementById('remoteaudio');
    if (!commonView.videoElement || !commonView.audioElement){
        SessionHandler.logSession('element error');
        !SessionHandler.isSessionInErrorState && commonView.showErrorModal();
    }
 
 
    document.addEventListener("visibilitychange", function() {
        EventHandler.visible = !document.hidden;
        SessionHandler.sendEvents({type:'stream',action:'page',is_visible:EventHandler.visible}); 
        SessionHandler.controlWebsocket&&EventHandler.visible&&!StreamHandler.isStreamStarting&&SessionHandler.setStreamStartTimeout();
    });
 
    navigator.vibrate = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;
    document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
    commonView.videoElement.requestPointerLock = commonView.videoElement.requestPointerLock || commonView.videoElement.mozRequestPointerLock || commonView.videoElement.webkitRequestPointerLock;
    commonView.showSpinner();  
 
    SessionHandler.getStreamingGatewayDetails((err, details) => {
        if (err) {
            const message = `${commonView.translate('team_ready')} (code ${err})`;
            !SessionHandler.isSessionInErrorState && commonView.showErrorModal(null, message, null);
            Log.e('cloud', err);
            SessionHandler.logSession('cloud error');
            return;
        }
        SessionHandler.streamingGatewayQueryString = details.data.queryString;
        const decodeQuery = JSON.parse(atob(SessionHandler.streamingGatewayQueryString.split(".")[1]));
        Log.d(decodeQuery);
        Chat.userName = decodeQuery.nickName;
        SessionHandler.getAppDetails();
        BROWSER_LAN = decodeQuery.language;
        
        commonView.showSpinnerText();
        Log.d('Cloud lan',BROWSER_LAN);
        document.getElementById('mic_title').innerHTML = commonView.translate('microphone');
        document.getElementById('paste-text').innerHTML=commonView.translate('paste_clipboard');
        document.getElementById('bright_title').innerHTML = commonView.translate('bright');
        //document.getElementById('ratio_title').innerHTML = commonView.translate('ratio');
 
        if (SYSTEM_STATS.IS_MOBILE) {
            const streamSharing = document.getElementById('share');
            //init zoom
            TouchHandler.zoom();
            window.addEventListener('orientationchange', () => {
                if (SYSTEM_STATS.IS_IPHONE) {
                    let axisLeft = document.getElementById('axisLeft');
                    let axisRight = document.getElementById('axisRight');
                    let rightBtns = document.getElementsByClassName('right-buttons')[0];
                    let dPad = document.getElementsByClassName('d-pad')[0];
 
                    if (window.orientation === 0 || window.orientation === 180) {
                        EventHandler.inLanscape = false;
                        axisLeft.style.bottom = '16px';
                        axisRight.style.bottom = '16px';
                        rightBtns.style.bottom = '30px';
                        dPad.style.bottom = '74px';
                    } else {
                        EventHandler.inLanscape = true;
                        if (SYSTEM_STATS.isNewIphoneVer()) {
                            axisLeft.style.bottom = '-7vh';
                            axisRight.style.bottom = '-7vh';
                            rightBtns.style.bottom = '30vh';
                            dPad.style.bottom = '30vh';
                        }
                    }
                } else if (screen.orientation) {
                    screen.orientation.type.includes('portrait') ? (EventHandler.inLanscape = false) : (EventHandler.inLanscape = true);
                }
                //EventHandler.inLanscape?EventHandler.initKeyboardAndMouse():EventHandler.release();
                let controlPanel = document.getElementById('controls');
                controlPanel.style.display = (!EventHandler.inLanscape&&StreamHandler.isStreamStarting&&!SessionHandler.isSessionInErrorState)?'flex':'none';
                
                streamSharing.style.display = (!EventHandler.inLanscape&&!VirtualController.isVisible&&StreamHandler.isStreamStarting&&!SessionHandler.isSessionInErrorState)?'block':'none';
                //hide keybord in landscape
                EventHandler.inLanscape && KeyboardHandler.hide();
                //reset zoom
                commonView.videoElement.style.transform = 'none';
                TouchHandler.zoomInit();
                //handle virtual controller
                if(VirtualController.isVisible){
                    VirtualController.releaseAxis();
                    VirtualController.initAxis();
                }
            });
            //virtual controller
            let controllerToggler = document.getElementById('controller-toggler');
            controllerToggler.style.display = 'flex';
            controllerToggler.addEventListener('click', () => {
                streamSharing.style.display = VirtualController.isVisible?'block':'none';
                controllerToggler.classList.toggle('opened');
                VirtualController.isVisible ? VirtualController.release() : VirtualController.init();
            }, false);
            //virtual mouse
            const mouseToggler = document.getElementById('mouse-toggler');
            mouseToggler.style.display = 'flex';
            mouseToggler.addEventListener('click',()=>{
                streamSharing.style.display = VirtualMouse.isVisible?'block':'none';
                mouseToggler.classList.toggle('opened');
                VirtualMouse.isVisible ? VirtualMouse.release() : VirtualMouse.init();
            },false);
             //virtual keyboard
             let virtualKeyboardEl = document.getElementById('keyboard-toggler');
             virtualKeyboardEl.style.display = 'flex';
             virtualKeyboardEl.addEventListener('click', () => {
                 if (!KeyboardHandler.keyboard) {
                     KeyboardHandler.show();
                     EventHandler.initKeyboardAndMouse();
                     streamSharing.style.display = 'none';
                 }
             });
            //fullscreen
            if (document.fullscreenEnabled) {
                let fullScrToggler = document.getElementById('fullscreen-toggler');
                fullScrToggler.style.display = 'flex';
                fullScrToggler.addEventListener('click', () => {
                     if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(err => {
                            Log.e(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                            SessionHandler.logSession(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                        });
                    } else {
                        document.exitFullscreen();
                    }
                });
            }
            //hide bright
            document.getElementById('bright-group').style.display = 'none';
            //hide desktop mic, show mobile mic
            document.getElementById('mic_image').style.display = 'none';
            document.getElementById('mic_title').style.display = 'none';
            document.getElementById('mic-switch').classList.add('mobile');
            //document.getElementById('ratio-group').style.display = 'none';
                //hide paste button text
            document.getElementById('paste-text').style.display = 'none';
            //handle mobile styles
            document.getElementById('paste').classList.add('mobile')
            document.getElementById('controls').classList.add('mobile')
            document.getElementById('language-wrapper').classList.add('mobile')
           
        }
 
        SessionHandler.getUserInfo();
        SessionHandler.calculateWssPing(details);
    });
 
    //listen mic control
    let elMicTitle = document.getElementById('mic_title');
    document.getElementById('mic-input').addEventListener('change',(e)=>{
        let data = {
            type: 'settings',
            action: 'microphone',
        }
        let elMicImg = document.getElementById('mic_image');
        let elMicSwitch = document.getElementById('mic-switch');
        if (e.target.checked) {
            elMicImg.style.fill = 'white';
            elMicTitle.style.color = 'white';
            elMicSwitch.classList.add('opened')
            webrtcStats.value.mic = true;
            data.value = true;
        } else {
            elMicImg.style.fill = '#9B99AD';
            elMicTitle.style.color = '#9B99AD';
            elMicSwitch.classList.remove('opened')
            data.value = false;
            webrtcStats.value.mic = false;
            JANUS_HELPER.janusAudioBridge && JANUS_HELPER.janusAudioBridge.destroy();
        }
        SessionHandler.sendEvents(data);
    });
    //listen ratio
    /*const elRatioTitle = document.getElementById('ratio_title');
    const elRatioImg = document.getElementById('ratio_image');
    const elRatioSwitch = document.getElementById('ratio-switch');
    const ratioElInput =  document.getElementById('ratio-input');
    if(localStorage.getItem('ratio')){
        ratioElInput.checked = true;
        ratioCheck(true);
    }
    
    ratioElInput.addEventListener('change',(e)=>{
        ratioCheck(e.target.checked);
        localStorage.setItem('ratio', e.target.checked);
    });
    function ratioCheck(is){
        if(is){
            elRatioTitle.style.color = 'white';
            elRatioImg.style.fill = 'white';
            elRatioSwitch.style.color = 'white';
            elRatioSwitch.classList.add('opened');
        }else{
            elRatioImg.style.fill = '#9B99AD';
            elRatioTitle.style.color = '#9B99AD';
            elRatioSwitch.classList.remove('opened');
        }
    }*/
    //listen bright
    const elBrightTitle = document.getElementById('bright_title');
    const elBrightImg = document.getElementById('bright_image');
    const elBrightSwitch = document.getElementById('bright-switch');
    const brightElInput =  document.getElementById('bright-input');
    if(localStorage.getItem('bright')==='1'){
        brightElInput.checked = true;
        brightCheck(true);
    }
    brightElInput.addEventListener('change',(e)=>{brightCheck(e.target.checked);});
    function brightCheck(is){
        localStorage.setItem('bright', is?1:0);
        if(type.includes('GeForce')||type.includes('NVIDIA')||type.includes('Intel')||type.includes('Radeon')||type.includes('AMD')||type.includes('Apple')||type.includes('Mali')||type.includes('Adreno')||type.includes('nouveau')){
            commonView.videoElement.style.filter = is?'contrast(87%) brightness(98%)':'none';
        }
        if(is){
            elBrightTitle.style.color = 'white';
            elBrightImg.style.fill = 'white';
            elBrightSwitch.style.color = 'white';
            elBrightSwitch.classList.add('opened');
        }else{
            elBrightImg.style.fill = '#9B99AD';
            elBrightTitle.style.color = '#9B99AD';
            elBrightSwitch.classList.remove('opened');
        }
    }
    //listen paste
    if (!SYSTEM_STATS.IS_MACOS && !SYSTEM_STATS.IS_CHROMIUM && !SYSTEM_STATS.IS_OPERA && !SYSTEM_STATS.IS_MOBILE) {
        document.getElementById('paste').style.display = 'none';
    }
    document.getElementById('paste').addEventListener('click', (e) => {
            let data = {
                type: 'keyboard',
                action: 'clipboard',
                text: ''
            }
 
            function delay(ms) {
                return new Promise((resolve) => {
                    setTimeout(resolve, ms);
                });
            }
            navigator.clipboard.readText().then(clipText => {
                data.text = clipText;
                SessionHandler.sendEvents(data);
                delay(50)
                    .then(_ => SessionHandler.sendEvents({ type: 'keyboard', action: 'button', isPressed: true, code: 162 }))
                    .then(_ => delay(50))
                    .then(_ => SessionHandler.sendEvents({ type: 'keyboard', action: 'button', isPressed: true, code: 86 }))
                    .then(_ => delay(50))
                    .then(_ => SessionHandler.sendEvents({ type: 'keyboard', action: 'button', isPressed: false, code: 162 }))
                    .then(_ => delay(50))
                    .then(_ => SessionHandler.sendEvents({ type: 'keyboard', action: 'button', isPressed: false, code: 86 }))
            });
        })
        //listen language controls
    const lanContainer = document.getElementById('languageList');
    let currentLanEl = document.getElementById('currentLanguage');
    //TODO get langs list from back
    let lanList = {
        1033:'English',
        1048:'Română',
        1045:'Polski',
        1031:'Deutsch',
        1036:'Français',
        1034:'Español',
        1040:'Italiano',
        1029:'Čeština',
        1051:'Slovenčina',
        1055:'Türkçe',
        2057:'English-GB',
        1058:'Українська',
        1044:'Norsk-Bokmål',
        4108:'Français de Suisse',
        2052:'中文 (简体)',
        2070:'Português',
        1046:'Português brasileiro'
    }
    if (localStorage.hasOwnProperty('language')) {
        let localLan = localStorage.getItem('language');
        currentLanEl.innerHTML = lanList[localLan];
    }
    let lanColum1 = document.getElementById('languageListColum1');
    let lanColum2 = document.getElementById('languageListColum2');
    Object.keys(lanList).sort((a, b) => lanList[a].localeCompare(lanList[b])).forEach((lanKey, index) => {
        let lanItemEl = document.createElement('a');
        lanItemEl.className = 'language__list-item';
        lanItemEl.innerHTML = lanList[lanKey];
 
        if (currentLanEl.innerHTML === lanList[lanKey]) {
            lanItemEl.style.color = '#00A3FF';
            lanItemEl.style.fontWeight = '500';
        }
        lanItemEl.addEventListener('click', () => {
            currentLanEl.innerHTML = lanList[lanKey];
            lanContainer.style.display = 'none';
            SessionHandler.sendLan(lanKey);
            localStorage.setItem('language', lanKey);
            let lanItemArray = document.querySelectorAll('.language__list-item');
            lanItemArray.forEach(el => {
                el.style.color = '#FFFFFF';
                el.style.fontWeight = '400';
            })
            lanItemEl.style.color = '#00A3FF';
            lanItemEl.style.fontWeight = '500';
        });
        if(index < 9){
            lanColum1.append(lanItemEl);
        }else{
            lanColum2.append(lanItemEl);
        }   
    });
    currentLanEl.addEventListener('click', () => {
        currentLanEl.classList.toggle('opened');
        lanContainer.style.display = (lanContainer.style.display === 'none') ? 'flex' : 'none';
    });
    //listen close session control
    document.getElementById('close-session-control').addEventListener('click', () => {
        lanContainer.style.display = 'none';
        new Modal({
            title: commonView.translate('terminate_session'),
            messageText: commonView.translate('are_sure'),
            messageSubText: commonView.translate('data_lost'),
            confirmBtnDo: () => {
                SessionHandler.terminate();
                SessionHandler.isSessionClosedByUser = true;
                commonView.hideSpinner();
                GamepadController.cancelUpdate();
                closeModalMessage();
 
                setTimeout(() => {
                    !SessionHandler.isSessionInErrorState && commonView.showErrorModal(commonView.translate('thank_game'),
                        commonView.translate('see_soon'),
                        'happy');
                });
            
            },
            cancelBtnTxt: commonView.translate('cancel'),
            confirmBtnTxt: commonView.translate('end_session'),
            closeTabOnConfirmBtn: false
        });
        
    });
    //listen close tab
    window.addEventListener('unload', function(e) {
        !StreamHandler.isStreamStarting&&SessionHandler.logSession('normal close');
        SessionHandler.terminate();
    });
    if (!SYSTEM_STATS.IS_MOBILE) {
        window.onbeforeunload = function() {
            return SessionHandler.isSessionClosedByUser ? null : true;
        }
    }
});
/*window.addEventListener('load', function() {
    window.history.pushState({}, '');
  })*/
const SYSTEM_STATS={
    USER_DEVICE_RESOLUTION : {
        width: window.devicePixelRatio ? Math.round(window.devicePixelRatio * screen.width) : screen.width,
        height: window.devicePixelRatio ? Math.round(window.devicePixelRatio * screen.height) : screen.height
    },
    IS_STANDALONE:window.matchMedia('(display-mode: standalone)').matches,
    IS_CHROMIUM:navigator.userAgent.includes("Chrome")&&document.fullscreenEnabled,
    IS_MOBILE:navigator.userAgent.includes("Android")||(navigator.platform.includes('arm')&&!navigator.userAgent.includes("CrOS"))|| navigator.platform.includes('iPhone')||navigator.platform.includes('iPad')||(navigator.platform.includes('MacIntel') && navigator.maxTouchPoints>1),
    IS_IPHONE:navigator.platform.includes('iPhone')||navigator.platform.includes('iPad')||(navigator.platform.includes('MacIntel') && navigator.maxTouchPoints>1),
    IS_MACOS:navigator.platform.includes('MacIntel'),
    IS_SAFARI: navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome"),
    IS_OPERA:navigator.userAgent.includes("OPR")&&document.fullscreenEnabled,
    USER_AGENT:navigator.userAgent,
    SYSTEM_LANGUAGE:navigator.systemLanguage,
    isNewIphoneVer:()=>{
        const str = 'Version/';
        const ua = navigator.userAgent;
        const ver =ua.substr(ua.indexOf(str)+str.length,2);
        return +ver>12;
    },
    getPlugins:()=>{
        let res="";
        for(let i=0;i<navigator.plugins.length;i++)
            res+=navigator.plugins[i].name+';';
        return res;
    },
    OS:navigator.oscpu,
    card:null,
    videoCardInfo:()=>{
        const gl = document.createElement('canvas').getContext('webgl');
        if (!gl) {
            return {
                error: "No webgl",
            };
        }
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return debugInfo ? {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            type:  gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
        } : {
            error: "No WEBGL_debug_renderer_info",
        };
    },
    PLATFORM:navigator.platform,
    TIME_ZONE:Intl.DateTimeFormat().resolvedOptions().timeZone,
    send:false
}
//Stream statistic
const webrtcStats = {
    type: 'statistic',
    action: 'webrtc',
    value: {
        rtt: {
            mouse: [],
            keyboard: [],
            controller: []
        },
        bitrate: {
            real: [],
            set: []
        },
        frames: {
            key: 0,
            total: 0,
            decoded: 0,
            rate: []
        },
        mic: false,
        network_type: 'unknown',
        network_downlink: 0,
        page: 'unknown',
        poor_connection: 0
    }
};
 
const StreamHandler = {
    isStreamStarting: false,
    isChangeGw: false,
    isAudioPlaing: false,
    startCountDelay: 0,
    finishCountDelay: 0,
    finishAudioDelay: 0,
    finishVideoDelay: 0,
    setBitrate: 0,
    virtualBitrate: 0,
    wasBitrate: false,
    currentBitrateStep: 0,
    K_DOWN: 52,
    K_UP: 56,
    wasUp: false,
    wasDown: false,
    statsInt: null,
    calculateSpeed: 0,
    prevState: true,
    lostCount: 0,
    skip:true,
    isStreamPaused: false,
    connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
    getNewStats: (pc) => {
        const STATS_COUNT = 10;
        const LOST_COUNT = 5;
        let emptyStats = 0;
        let showPoorCount = 0;
        let sendStatsCount = 0;
        let statsTotalFrameRecieved = 0;
        let statsTotalFrameDecoded = 0;
        let statsTotalPacketsLost = 0;
        let statsTotalPacketsReceived = 1;
        let statsBytesReceived = 0;
        if (!StreamHandler.statsInt) {
            StreamHandler.statsInt = setInterval(() => {
                if (commonView.isSessionInErrorState) {
                    StreamHandler.clearStreamIntervals();
                }
                if (pc) {
                    pc.getStats(null)
                        .then(results => {
                            ((results) => {
                                results.forEach(res => {
                                    switch (res.type) {
                                        case 'local-candidate':
                                            webrtcStats.value.page = EventHandler.visible ? 'visible' : 'hidden';
                                            webrtcStats.value.network_type = res.networkType;
                                            webrtcStats.value.network_downlink = (StreamHandler.connection) ? StreamHandler.connection.downlink : 'not_support';
                                            break;
                                        case 'inbound-rtp':
                                            let diffFrameReceived = -1;
                                            let diffFrameDecoded = -1;
                                            if ('framesReceived' in res) {
                                                webrtcStats.value.frames.total = res.framesReceived;
                                                diffFrameReceived = res.framesReceived - statsTotalFrameRecieved;
                                            }
                                            if ('framesDecoded' in res) {
                                                webrtcStats.value.frames.decoded = res.framesDecoded;
                                                diffFrameDecoded = res.framesDecoded - statsTotalFrameDecoded;
                                            }
                                            let diffPacketsLost = ('packetsLost' in res) ? (res.packetsLost - statsTotalPacketsLost) : -1;
                                            let lostPercent = 0;
                                            if ('packetsReceived' in res) {
                                                let diffPacketsReceive = res.packetsReceived - statsTotalPacketsReceived;
                                                diffPacketsReceive = diffPacketsReceive===0?1:diffPacketsReceive;
                                                lostPercent = Math.ceil(diffPacketsLost * 100 / diffPacketsReceive);
                                                StreamHandler.checkGlobalLostRange(lostPercent);
                                                statsTotalPacketsReceived = res.packetsReceived;
                                            }
 
                                            let bitrate = ('bytesReceived' in res) ? ((res.bytesReceived - statsBytesReceived) * 8) : -1;
 
                                            statsTotalFrameRecieved = res.framesReceived;
                                            statsTotalFrameDecoded = res.framesDecoded;
                                            statsBytesReceived = res.bytesReceived;
                                            statsTotalPacketsLost = res.packetsLost;
                                            webrtcStats.value.bitrate.real.push(bitrate);
                                            webrtcStats.value.frames.key = res.keyFramesDecoded;
                                            webrtcStats.value.frames.rate.push(diffFrameDecoded);
                                            SessionHandler.sendEvents({
                                                type: 'stream',
                                                action: 'bitrate',
                                                framerateDecoded: diffFrameDecoded,
                                                framerateReceived: diffFrameReceived,
                                                lossPacket: lostPercent,
                                                realBitrate: bitrate
                                            });
                                            Log.d('Lost percent = '+lostPercent+"%");
                                            if(EventHandler.visible) {
                                                StreamHandler.lostCount = diffFrameDecoded===0?StreamHandler.lostCount+1:0;
 
                                                if(StreamHandler.lostCount >= LOST_COUNT){
                                                    SessionHandler.tryToChangeGw();
                                                }
                                            }
                                            break;
                                    }
                                });
                            })(results);
                        }, err => {
                            Log.e(err);
                        });
                } else {
                    !SessionHandler.isSessionInErrorState && commonView.showErrorModal();
                    SessionHandler.logSession('stats error');
                }
                sendStatsCount++;
                if (sendStatsCount > STATS_COUNT) {
                    if (webrtcStats.value.frames.rate.length === 0) {
                        emptyStats++;
                    } else {
                        emptyStats = 0;
                    }
                    if(emptyStats > 3){
                        SessionHandler.isSessionInErrorState && commonView.showErrorModal();
                        SessionHandler.logSession('empty stats error');
                    }
 
                    SessionHandler.sendEvents(webrtcStats);
                    StreamHandler.clearStats();
                    sendStatsCount = 0;
                }
 
            }, STATS_INTERVAL);
        }
    },
    clearStats: () => {
        for (let key in webrtcStats.value.rtt)
            webrtcStats.value.rtt[key].length = 0;
        for (let key in webrtcStats.value.bitrate)
            webrtcStats.value.bitrate[key].length = 0;
        webrtcStats.value.frames.rate.length = 0;
        StreamHandler.lostCount = 0;
    },
    checkGlobalLostRange: (lostPercent) => {
        StreamHandler.wasBitrate = true;
        let poorConnection = 0;
        if (lostPercent === 2) {
            poorConnection = 1;
        } else if (lostPercent > 2 && lostPercent <= 4) {
            poorConnection = 2;
        } else if (lostPercent > 4) {
            poorConnection = 3;
        }
        const last = webrtcStats.value.poor_connection;
 
        if(poorConnection < last){ 
            if(StreamHandler.skip){
                StreamHandler.skip = !StreamHandler.skip;
                return;
            }
            if ((last - poorConnection)>1){   
                poorConnection = last-1;
            } 
            StreamHandler.skip = !StreamHandler.skip;         
        }
        webrtcStats.value.poor_connection = poorConnection;
        !SessionHandler.isSessionInErrorState && commonView.showPoorInetConnectionWarning(poorConnection);
    },
 
    sendSystemInfo: () => {
        SYSTEM_STATS.send = true;
        let tsDelay = (StreamHandler.finishCountDelay > 0) ? (StreamHandler.finishCountDelay - StreamHandler.startCountDelay) : 0;
        let tsAudioDelay = (StreamHandler.finishAudioDelay > 0) ? (StreamHandler.finishAudioDelay - StreamHandler.startCountDelay) : 0;
        let tsVideoDelay = (StreamHandler.finishVideoDelay > 0) ? (StreamHandler.finishVideoDelay - StreamHandler.startCountDelay) : 0;
        let nType = StreamHandler.connection ? StreamHandler.connection.type : 'not_support';
        let info = {
            type: 'statistic',
            action: 'computer',
            value: {
                streaming_version: version,
                gateway_list: SessionHandler.parsePings,
                time_to_start: tsDelay,
                audio_delay:tsAudioDelay,
                video_delay:tsVideoDelay,
                video_id:SessionHandler.janusStreamingVideoId,
                network_type:nType?nType:'unknown',
                network_downlink:StreamHandler.calculateSpeed?(+StreamHandler.calculateSpeed):'unknown',
                user_agent:SYSTEM_STATS.USER_AGENT,
                sys_language:SYSTEM_STATS.SYSTEM_LANGUAGE,
                screen:SYSTEM_STATS.USER_DEVICE_RESOLUTION,
                os:SYSTEM_STATS.OS,
                plugins:SYSTEM_STATS.getPlugins(),
                timezone:SYSTEM_STATS.TIME_ZONE,
                engine:SYSTEM_STATS.PLATFORM,
                render:SYSTEM_STATS.card
            } 
        }
        SessionHandler.sendEvents(info);
    },
    clearStreamIntervals: () => {
        StreamHandler.statsInt && clearInterval(StreamHandler.statsInt);
        StreamHandler.statsInt = null;
        SessionHandler.sessionStartTimeout && clearTimeout(SessionHandler.sessionStartTimeout);
        SessionHandler.sessionStartTimeout = null;
    }
};
 
//Session handler
const SessionHandler = {
    wssErrorTimeout: null,
    janusStreamingVideoId: null,
    janusStreamingAudioId: null,
    isSessionInErrorState: false,
    isWssOpen: false,
    isSessionClosedByUser: false,
    controlWebsocket: null,
    streamingGatewayQueryString: null,
    sessionId: '00000000-0000-0000-0000-000000000000',
    connectionAttemptStep: 0,
    parsePings: [],
    tempPing: [],
    isGwFromCloud: false,
    reservGWList: [],
    sessionStartTimeout: null,
    reservUrl: null,
    pingTimeout: null,
    wasRemoteStream:false,
    sendEvents: (data) => {
        SessionHandler.isWssOpen && SessionHandler.controlWebsocket && SessionHandler.controlWebsocket.send(JSON.stringify(data));
    },
    logSession:(msg) =>{
        let data = {
            sessionId:SessionHandler.sessionId,
            message: msg
        };
        Log.d(data);
        const url = JSON.parse(localStorage.getItem('homeLink'))+'/api/v1/streaming/session/log';
        const ACCESS_TOKEN = SessionHandler.getCookie('access_token');
        const AUTH_DATA_TOKEN = SessionHandler.getCookie('boosteroid_auth');
        fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ACCESS_TOKEN,
                    'Authorization-Data': AUTH_DATA_TOKEN
                },
                body: JSON.stringify(data)
            });
    },
    terminate: () => {
        Share.saveState();
        SessionHandler.sendEvents({ type: 'settings', action: 'terminating' });
    },
    sendLan: (lanKey) => {
        try {
            SessionHandler.sendEvents({
                type: 'keyboard',
                action: 'language',
                code: parseInt(lanKey)
            });
        } catch (err) { Log.e(err); }
    },
    getCookie: (cname) => {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) === ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) === 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    },
    getStreamingGatewayDetails: (cb) => {
        //const ACCESS_TOKEN = localStorage.getItem('Token');
        //let sgwDetailsUrl = 'https://stage.cloud.boosteroid.com/api/v1.0/streaming/getstreaminggatewaydetails/'+ window.location.search;
        SessionHandler.sessionId = window.location.search.slice(9);
        Log.d(`Session = ${SessionHandler.sessionId }`);
        let sgwDetailsUrl = "/api/v1/streaming/session/details" + window.location.search;
        const ACCESS_TOKEN = SessionHandler.getCookie('access_token');
        const AUTH_DATA_TOKEN = SessionHandler.getCookie('boosteroid_auth');
 
        var xhr = new XMLHttpRequest();
        xhr.open("POST", sgwDetailsUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('Authorization', ACCESS_TOKEN);
        xhr.setRequestHeader('Authorization-Data', AUTH_DATA_TOKEN);
        xhr.onload = function(e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    cb(null, JSON.parse(xhr.responseText));
                } else if (xhr.status === 401) {
                    window.location.href = JSON.parse(localStorage.getItem('homeLink')) + '/auth/login';
                } else {
                    cb(xhr.status);
                }
            } else {
                Log.d("State " + xhr.readyState);
            }
        };
        xhr.onerror = function(e) {
            cb(xhr.status);
        };
        xhr.send(null);
    },
    getGwList: () => {
        const url = 'api/streaming/gateways';
        const ACCESS_TOKEN = SessionHandler.getCookie('access_token');
        const AUTH_DATA_TOKEN = SessionHandler.getCookie('boosteroid_auth');
        fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ACCESS_TOKEN,
                    'Authorization-Data': AUTH_DATA_TOKEN
                }
            })
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                console.log(data);
            });
    },
    getAppDetails:()=>{
        const home = JSON.parse(localStorage.getItem("homeLink"));
        const appId = JSON.parse(localStorage.getItem("appId"));
        if(home && appId){
            const url = `${home}/api/v1/boostore/applications/${appId}`;
            const ACCESS_TOKEN = SessionHandler.getCookie('access_token');
            const AUTH_DATA_TOKEN = SessionHandler.getCookie('boosteroid_auth');
            fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': ACCESS_TOKEN,
                    'Authorization-Data': AUTH_DATA_TOKEN
                }
            })
            .then((response) => {
                return response.json();
            })
            .then((response) => {
                console.log(response);
                Share.defTitle = `${response.data.name} by ${Chat.userName}, broadcast from Boosteroid, ${commonView.getDate()}`;
                if(Share.defTitle.length>100)
                    Share.defTitle =  Share.defTitle.substring(0,97)+'...';
                Share.defDescription = `${response.data.name}. Boosteroid Cloud Gaming Live Broadcast. https://boosteroid.com #${response.data.name} #Boosteroid`;
            
            })
            .catch(error => {
                console.log(error);
                Share.defTitle = `Game by ${Chat.userName}, broadcast from Boosteroid, ${commonView.getDate()}`;
                Share.defDescription = `Boosteroid Cloud Gaming Live Broadcast. https://boosteroid.com #Boosteroid`;
              });
        }else{
            Share.defTitle = `Game by ${Chat.userName}, broadcast from Boosteroid, ${commonView.getDate()}`;
            Share.defDescription = `Boosteroid Cloud Gaming Live Broadcast. https://boosteroid.com #Boosteroid`;
        }
    },
    runSpeedTest:(tmpUrl)=>{
        let posPort =  tmpUrl.lastIndexOf(':');
        let urlCheck = tmpUrl.slice(0,posPort+1)+'3080/i.jpg';
        const downloadSize = 2101546;
        let endTime;
        let download = new Image();
        download.onload = function () {
            const pingArray = SessionHandler.parsePings.filter(item=>{
                return item.address===tmpUrl;
            });
            let rtt = pingArray.length>0?pingArray[0].ping:0;
            endTime = (new Date()).getTime();
            const delta = (endTime-startTime);
            const finDelta = delta-rtt>0?(delta-rtt)/1000:delta/1000;
            StreamHandler.calculateSpeed = ((downloadSize*8)/finDelta).toFixed(0);
            StreamHandler.wasBitrate&&SessionHandler.sendEvents({ type: 'stream', action: 'bandwidth', value: +StreamHandler.calculateSpeed });
            Log.v(`${tmpUrl} speed = ${StreamHandler.calculateSpeed}`);
        }
 
        download.onerror = function(err, msg) {
            Log.e('error', err);
        }
 
        let startTime = (new Date()).getTime();
        var cacheBuster = "?t=" + startTime;
        download.src = urlCheck + cacheBuster;
    },
    setStreamStartTimeout:()=>{
        if(!SessionHandler.sessionStartTimeout){
            SessionHandler.sessionStartTimeout = setTimeout(()=>{
                if((!StreamHandler.isStreamStarting || StreamHandler.isChangeGw)&&EventHandler.visible){
                    StreamHandler.sendSystemInfo();
                    !SessionHandler.isSessionInErrorState&&commonView.showErrorModal();
                    SessionHandler.logSession('video stream decoding error');
                }else{
                    SessionHandler.sessionStartTimeout&&clearTimeout(SessionHandler.sessionStartTimeout);
                    SessionHandler.sessionStartTimeout = null;
                }
            }, START_CHECK_DELAY);
        }
    },
    getUserInfo:()=>{
        const home = JSON.parse(localStorage.getItem("homeLink"));
        Log.d('Home',home);
        const url =`${home}/api/v1/user`;
        const ACCESS_TOKEN = SessionHandler.getCookie('access_token');
        const AUTH_DATA_TOKEN = SessionHandler.getCookie('boosteroid_auth');
        fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': ACCESS_TOKEN,
                'Authorization-Data': AUTH_DATA_TOKEN
            }
          }) 
          .then((response) => {
            return response.json();
          })
          .then((user) => {
            console.log(user);
            if(user.data.socialAuths&&user.data.socialAuths.youtube){
                Share.ytAccount = user.data.socialAuths.youtube.nickname;
                Share.ytConnected = user.data.socialAuths.youtube.verified;
            }
            
            Share.boosAccount = user.data.name;
            Share.init();
            document.getElementById('share_toggle-view').addEventListener('click', ()=> {
                Share.toggleTop();
            })
          })
          .catch(error => {
            console.log(error);
            let jError = error.json();
            Share.showForbidden(`${jError.error_message}  ${jError.error_code}`)
          });
 
    },
    tryToChangeGw:()=>{
        Log.v('Start to change gw');
        if (!SessionHandler.isWssOpen) {
            StreamHandler.isStreamPaused = false;
        }
        if ((StreamHandler.isStreamPaused || StreamHandler.isChangeGw) && SessionHandler.isWssOpen) {
            Log.v('Try to change gw, but stream is paused or changed');
            return;
        }
        StreamHandler.isChangeGw = true;
        //clear stats
        SessionHandler.sendEvents(webrtcStats);
        StreamHandler.clearStats();
        //clear intervals
        StreamHandler.clearStreamIntervals();
        //sets stats count 
        StreamHandler.startCountDelay = 0;
        StreamHandler.finishCountDelay = 0;
 
        StreamHandler.finishAudioDelay = 0;
        StreamHandler.finishVideoDelay = 0;
 
        StreamHandler.wasBitrate = false;
        SessionHandler.wasRemoteStream = false;
        //hide poor connection
        commonView.showPoorInetConnectionWarning(0);
        webrtcStats.value.poor_connection = -1;
 
        //destroy janus
        try {
            JANUS_HELPER.destroyJanusSession();
            JANUS_HELPER.disableMic();
        } catch (error) { Log.e('Destroy janus', error); }
        //close web socket
        SessionHandler.controlWebsocket && SessionHandler.controlWebsocket.close();
        SessionHandler.controlWebsocket = null;
 
        SessionHandler.isSessionClosedByUser = false;
 
        let tmpUrl;
        if (SessionHandler.reservUrl) {
            tmpUrl = SessionHandler.reservUrl;
        } else if (SessionHandler.connectionAttemptStep < SessionHandler.parsePings.length) {
            tmpUrl = SessionHandler.parsePings[SessionHandler.connectionAttemptStep]['address'];
        }
 
        let gwUrl = tmpUrl ? SessionHandler.parseUrlGw(tmpUrl) : null;
        Log.v('Reserv url ' + gwUrl);
 
        if (gwUrl) {
            SessionHandler.reservUrl = gwUrl;
            SessionHandler.wssHandler(gwUrl);
        } else {
            !SessionHandler.isSessionInErrorState && commonView.showErrorModal();
            SessionHandler.logSession('change gw error');
            Log.v(`Try to change gw, reserv url == ${gwUrl}, show error!`);
 
            if (SessionHandler.isWssOpen) {
                SessionHandler.terminate();
                SessionHandler.controlWebsocket.close();
            }
        }
    },
    parseUrlGw: (url) => {
        try {
            let gwProtocol = 'https://';
            let gwRegion = url.slice(gwProtocol.length, gwProtocol.length + 2);
            let posDot = url.indexOf('.');
            let gwNumber = parseInt(url.slice(gwProtocol.length + 2, posDot));
            let reservNumber = (gwNumber % 2 === 0) ? gwNumber + 1 : gwNumber - 1;
            return gwProtocol + gwRegion + reservNumber + url.slice(posDot);
        } catch (err) {
            Log.e(err);
            return null;
        }
    },
    tryToNextGw: () => {
        SessionHandler.connectionAttemptStep++;
        if (SessionHandler.connectionAttemptStep < SessionHandler.parsePings.length) {
            SessionHandler.controlWebsocket && SessionHandler.controlWebsocket.close();
            SessionHandler.controlWebsocket = null;
            let nextGw = SessionHandler.parsePings[SessionHandler.connectionAttemptStep]['address'];
            return SessionHandler.wssHandler(nextGw);
        } else {
            !SessionHandler.isSessionInErrorState && commonView.showErrorModal(commonView.translate('no_resource'), commonView.translate('try_later'), 'sad');
            SessionHandler.logSession('no resource error');
            return;
        }
    },
    tryFilterNexGw: () => {
        SessionHandler.connectionAttemptStep++;
        if ((SessionHandler.connectionAttemptStep < SessionHandler.parsePings.length) && !StreamHandler.isStreamStarting && !SessionHandler.isSessionClosedByUser&&!SessionHandler.isSessionInErrorState) {
            SessionHandler.controlWebsocket&&SessionHandler.controlWebsocket.close();
            SessionHandler.controlWebsocket = null;
            let nextGw = SessionHandler.parsePings[SessionHandler.connectionAttemptStep]['address'];
            if (SessionHandler.reservGWList.some((item) => {
                    if (item === nextGw)
                        return true;
                })) {
                return SessionHandler.tryFilterNexGw();
            } else {
                return nextGw;
            }
 
        } else {
            return null;
        }
    },
    calculateWssPing: (details) => {
        function connect(gw) {
            let sendCount = 0;
            const currentWss = new WebSocket(`wss://${gw.address.split('//')[1]}/?${SessionHandler.streamingGatewayQueryString}&ping=1`);
            currentWss.onopen = () => {
                !SessionHandler.isSessionInErrorState&&currentWss.send(JSON.stringify({ type: 'settings', action: 'ping', value: (new Date()).getTime() }));
            }
            currentWss.onmessage = (evt) => {
                if(!SessionHandler.isSessionInErrorState&&!StreamHandler.isStreamStarting&&(SessionHandler.parsePings.length<rawGwList.length)){
                    if (sendCount < 4) {
                        currentWss.send(evt.data);
                        sendCount++;
                    } else {
                        let delta = Math.ceil(((new Date()).getTime() - JSON.parse(evt.data).value) / 5);
                        currentWss.close();
                        Log.d(`Ping ${gw.address} with delay ${delta}`);
                        SessionHandler.tempPing.push({ping:delta,address:gw.address});
                        let progress =Math.floor((STEP*SessionHandler.tempPing.length)/rawGwList.length);
                        commonView.showProgress(SessionHandler.isGwFromCloud?commonView.translate('tips_loader_connect'):commonView.translate('tips_loader_search'),progress);
                        if(SessionHandler.tempPing.length === rawGwList.length){
                            SessionHandler.pingTimeout&&clearTimeout(SessionHandler.pingTimeout);
                            startSession();
                        }
                    }
                }
            }
            currentWss.onerror = (err) => {
                Log.e(`Error ${err}`)
                SessionHandler.tempPing.push({ping:-1,address:gw.address});
            }
        }
        function showError() {
            !SessionHandler.isSessionInErrorState && commonView.showErrorModal(commonView.translate('no_resource'),
                commonView.translate('try_later'),
                'sad');
        }
 
        function startSession(){
            SessionHandler.tempPing.forEach((gwObject)=>SessionHandler.parsePings.push(gwObject));
            SessionHandler.parsePings = SessionHandler.parsePings.sort((gatewayHost1, gatewayHost2)=>gatewayHost1.ping-gatewayHost2.ping);
            Log.v(SessionHandler.parsePings);
            if(SessionHandler.parsePings.length===0){
                showError();
                SessionHandler.logSession('empty SG list error');
                return;
            }
            for(SessionHandler.connectionAttemptStep = 0;SessionHandler.connectionAttemptStep<SessionHandler.parsePings.length;SessionHandler.connectionAttemptStep++){
                if(SessionHandler.parsePings[SessionHandler.connectionAttemptStep].ping>0){
                    commonView.showProgress(commonView.translate('tips_loader_search'),STEP);
                    SessionHandler.wssHandler(SessionHandler.parsePings[SessionHandler.connectionAttemptStep]['address']);
                    return;
                }
            }
            if(SessionHandler.connectionAttemptStep===SessionHandler.parsePings.length){
                showError();
                SessionHandler.logSession('connection to SG error');
                return;
            }
        }
        if(!localStorage.getItem('gateway_pings')){
            Log.d('Gw is is null');
            SessionHandler.logSession('empty SG list error');
            showError();
            return;
        }
        const rawGwList = JSON.parse(localStorage.getItem('gateway_pings'));
        if(details.data.gw){
            SessionHandler.isGwFromCloud = true;
            commonView.showProgress(commonView.translate('tips_loader_connect'),0);
            Log.d('Receive gw', details.data.gw);
            connect( {address:details.data.gw});
            SessionHandler.parsePings = SessionHandler.tempPing;
            
            Log.v(SessionHandler.parsePings);
            Log.v(`Start at ${details.data.gw}`);
            
            SessionHandler.reservUrl = details.data.gw;
            commonView.showProgress(commonView.translate('tips_loader_connect'),STEP);
            SessionHandler.wssHandler(details.data.gw);
            return;
        }else{
            SessionHandler.isGwFromCloud = false;
            commonView.showProgress(commonView.translate('tips_loader_search'),0);
            rawGwList.forEach((gw)=>connect(gw));
            SessionHandler.pingTimeout = setTimeout(()=>{
               
                if(SessionHandler.tempPing.length<rawGwList.length){
                    for(const rawGw of rawGwList){
                        if(!SessionHandler.tempPing.some((pingGw)=>rawGw.address === pingGw.address)){
                            SessionHandler.parsePings.push({ping:-1,address:rawGw.address});
                        }
                    }
                }
                !SessionHandler.isSessionInErrorState&&startSession();
                return;
                
            }, 10000);
        }
    },
 
    wssHandler:(streamingGatewayAddress)=>{
        const USER_DEVICE_RESOLUTION = {
            width: window.devicePixelRatio ? Math.round(window.devicePixelRatio * screen.width) : screen.width,
            height: window.devicePixelRatio ? Math.round(window.devicePixelRatio * screen.height) : screen.height
        };
        console.log(USER_DEVICE_RESOLUTION);
 
        let tmpW = Math.max(USER_DEVICE_RESOLUTION.width,USER_DEVICE_RESOLUTION.height);
        let tmpH = Math.min(USER_DEVICE_RESOLUTION.width,USER_DEVICE_RESOLUTION.height);
        USER_DEVICE_RESOLUTION.width = tmpW;
        USER_DEVICE_RESOLUTION.height = tmpH;
        JANUS_HELPER.server = streamingGatewayAddress + "/janus";
        let isMobile = SYSTEM_STATS.IS_MOBILE?1:0;
        let wss_url = "wss://" + streamingGatewayAddress.split('//')[1] + "/?" + SessionHandler.streamingGatewayQueryString + '&x=' + USER_DEVICE_RESOLUTION.width + '&y=' + USER_DEVICE_RESOLUTION.height+'&mobile='+isMobile+'&lang='+BROWSER_LAN;
        
        !SessionHandler.controlWebsocket&&(SessionHandler.controlWebsocket = new WebSocket(wss_url));
        SessionHandler.controlWebsocket.onopen = function () {
            SessionHandler.wssErrorTimeout&&clearTimeout(SessionHandler.wssErrorTimeout);
            SessionHandler.wssErrorTimeout = null;
            SessionHandler.runSpeedTest(streamingGatewayAddress);
            SessionHandler.isWssOpen = true;
            StreamHandler.startCountDelay = new Date().getTime();
            Log.v(`Current gw: ${streamingGatewayAddress}, wss open ${SessionHandler.isWssOpen}`);
            commonView.showProgress(commonView.translate('tips_loader_connect'),(commonView.progresState+5)%(2*STEP));
        };
 
        SessionHandler.controlWebsocket.onclose = function(event) {
            !SessionHandler.wssErrorTimeout && (SessionHandler.wssErrorTimeout = setTimeout(() => {
                !SessionHandler.isSessionInErrorState && SessionHandler.logSession('ping procedure error');
                !SessionHandler.isSessionInErrorState && commonView.showErrorModal();
            }, START_CHECK_DELAY / 2));
            SessionHandler.isWssOpen = false;
            if ((event.code !== 1000) && !SessionHandler.isSessionInErrorState && StreamHandler.isStreamStarting) {
                if (SessionHandler.controlWebsocket.readyState === 3) {
                    SessionHandler.tryToChangeGw();
                } else {
                    !SessionHandler.isSessionInErrorState &&SessionHandler.logSession('ping procedure error');
                    !SessionHandler.isSessionInErrorState && commonView.showErrorModal();
                }
            }
        };
 
        SessionHandler.controlWebsocket.onmessage = function(evt) {
            if (!evt.data)
                return;
            const message = JSON.parse(evt.data);
            const msgType = message.type;
            if (!msgType)
                return;
            switch (msgType) {
                case 'mouse':
                    webrtcStats.value.rtt.mouse.push((new Date().getTime()) - message.time);
                    break;
                case 'keyboard':
                    (message.action === 'button') && webrtcStats.value.rtt.keyboard.push((new Date().getTime()) - message.time);
                    break;
                case 'controller':
                    if (message.action === 'connected') {
                        if (message.name === VirtualController.name) {
                            VirtualController.connect(message);
                        } else {
                            GamepadController.connectController(message);
                        }
                    } else if (message.action === 'rumble') {
                        GamepadController.vibrate(message.id, message.left, message.right);
                    } else {
                        webrtcStats.value.rtt.controller.push((new Date().getTime()) - message.time);
                    }
                    break;
                case 'cursor':
                    CursorHandler.validateCursorDataJSON(message);
                    break;
                case 'settings':
                    switch (message.action) {
                        case 'streamIds':
                            SessionHandler.janusStreamingVideoId = message.value.video;
                            SessionHandler.janusStreamingAudioId = message.value.audio;
                            commonView.showProgress(commonView.translate('tips_loader_connect'),(commonView.progresState+10)%(2*STEP));
                            JANUS_HELPER.initJanusVideo(SessionHandler.janusStreamingVideoId);
                            JANUS_HELPER.initJanusAudio(SessionHandler.janusStreamingAudioId);
                            
                            break;
                        case 'microphone':
                            JANUS_HELPER.initJanusAudioBridge(message.value);
                            break;
                        case'share':
                            Log.d('Share',message);
                            if(message.value){
                                message.value.casts.forEach(el => {
                                    if(el.cast==='private'){
                                        if(el.is_enable){
                                            Share.shareLinkBoost = el.link;
                                            Share.shareLinkBoost&&Chat.init();
                                        }else{
                                            Share.showDisabledBoostBlock();
                                        }                                           
                                    }
                                    if(el.cast==='youtube'){
                                        if(el.is_enable){
                                            Share.shareLinkYT = el.link;
                                        }else{
                                            Share.showDisabledYtBlock();
                                        }
                                    }
                                    
                                });
                                Share.hideBlockSpinner();
                                Share.hideSpinner();
                                !Share.isBoostEnable&&!Share.isYtEnable&&Share.showBroadCast(false);
                            }
                            if(message.limits){
                                Share.shareCountBoos = message.viewers;
                                Share.shareLimitBoos = message.limits;
                                Share.updateViewersCount();
                            }
                          
                            break;
                        case 'terminating':
                            if (SessionHandler.connectionAttemptStep < SessionHandler.parsePings.length) {
                                let reservUrl = SessionHandler.parseUrlGw(SessionHandler.parsePings[SessionHandler.connectionAttemptStep]['address']);
                                reservUrl && SessionHandler.reservGWList.push(reservUrl)
                            }
                            
                            let next = SessionHandler.tryFilterNexGw();
                            if (next && !SessionHandler.isGwFromCloud &&!SessionHandler.wasRemoteStream) {
                                Log.v(`Next gw ${next}`);
                                return SessionHandler.wssHandler(next);
                            } else {
                                const title = message.title ? message.title : null;
                                const value = message.value ? message.value : null;
                                const icon = message.icon ? message.icon : null;
                                StreamHandler.statsInt && clearInterval(StreamHandler.statsInt);
                                !SessionHandler.isSessionInErrorState && commonView.showErrorModal(title, value, icon);
                                !SYSTEM_STATS.send&&StreamHandler.sendSystemInfo();
                                !StreamHandler.isStreamStarting&&SessionHandler.logSession('no resources error');
                            }
                            break;
                        case 'progress':
                            let progress = Math.floor(message.value*STEP/100);
                            Log.d(`Progress ${progress} receive ${message.value}`);
                            commonView.showProgress(commonView.translate('tips_loader_title'),2*STEP+progress);
                            if(message.value===100){
                                EventHandler.visible&&SessionHandler.setStreamStartTimeout();
                            }else{
                                SessionHandler.sessionStartTimeout&&clearTimeout(SessionHandler.sessionStartTimeout);
                                SessionHandler.sessionStartTimeout = null;
                                EventHandler.visible&&SessionHandler.setStreamStartTimeout();
                            }
                            break;
                    }
                case 'message':
                    switch (message.action) {
                        case 'warning':
                            commonView.showMessageFromGW(message.value);
                            break;
                        case 'time_expired':
                            commonView.showMessageFromGW(`${message.value} in ${message.time} min`);
                            break;
                        case 'maintenance':
                            commonView.showMessageFromGW(`${message.value} in ${message.time} min`);
                            break;
                        case 'activity':
                            document.getElementById('languageList').style.display='none';
                            !SYSTEM_STATS.IS_MOBILE && EventHandler.release();
                             SessionHandler.sendEvents({
                                        type: 'settings',
                                        action: 'activity',
                                        value: 'I am here'
                                    });
                            break;
                    }
                    break;
                case 'stream':
                    switch (message.action) {
                        case 'bitrate':
                            Log.d(message);
                            if (!StreamHandler.wasBitrate) {
                                SessionHandler.sendLan(localStorage.hasOwnProperty('language') ? localStorage.getItem('language') : 1033);
                                StreamHandler.wasBitrate = true;
                                StreamHandler.calculateSpeed&&SessionHandler.sendEvents({ type: 'stream', action: 'bandwidth', value: +StreamHandler.calculateSpeed });
                            }
                            webrtcStats.value.bitrate.set.push(message.value);
                            break;
                    }
                    break;
                case 'browser':
                    if (message.action === 'open_link')
                        window.open(message.value, '_blank');
                    break;
            }
        };
 
        SessionHandler.controlWebsocket.onerror = function() {
            Log.v('Wss error');
            SessionHandler.isWssOpen = false;
            if (SessionHandler.isSessionClosedByUser || SessionHandler.isSessionInErrorState) {
                StreamHandler.clearStreamIntervals();
                return;
            }
            if (!StreamHandler.isStreamStarting && !SessionHandler.isSessionInErrorState) {
                SessionHandler.tryToNextGw();
            }
 
        };
    }
}