var sender = Math.round(Math.random() * 999999999) + 999999999;
var name = urlParams.name.length?urlParams.name[0]:"";
var connectedToTeacher = false;
var socketConn = null;
var muteunmuteRoomButton = null;
var teacherId = "";
var myStream = {};
var config = {
    openSocket: function(config) {
        config.channel = config.channel || urlParams.channel[0];

        io.connect(SIGNALING_SERVER).emit('new-channel', {
            channel: config.channel,
            sender: sender
        });

        var socket = io.connect(SIGNALING_SERVER + config.channel);
        socketConn = socket;

        socket.channel = config.channel;
        socket.on('connect', function () {
            if (config.callback) config.callback(socket);
        });

        socket.send = function (message) {
            socket.emit('message', {
                sender: sender,
                data: message
            });
        };

        socket.on('message', config.onmessage);

        socket.on("unmute-request",function(data){
            if(data.type=="unmute"){
                myStream.getAudioTracks()[0].enabled = true;
                muteunmuteRoomButton.innerHTML = "Accepted";
            }
            else if(data.type=="decline"){
                muteunmuteRoomButton.innerHTML = "Declined";
                setTimeout(function(){
                    muteunmuteRoomButton.innerHTML = "Un mute";
                },2000);
            }
            else{
                muteunmuteRoomButton.innerHTML = "Stoped";
                myStream.getAudioTracks()[0].enabled = false;

                setTimeout(function(){
                    muteunmuteRoomButton.disabled = false;
                    muteunmuteRoomButton.innerHTML = "Un mute";
                },2000);
            }
        });
    },
    onRemoteStream: function(media) {
        if(!connectedToTeacher){
            var mediaElement = getMediaElement(media.video, {
                width: (videosContainer.clientWidth / 2) - 50,
                buttons: ['mute-audio', 'mute-video', 'full-screen', 'volume-slider']
            });
            mediaElement.id = media.stream.streamid;
            media.video.play();
            videosContainer.appendChild(mediaElement);
            connectedToTeacher = true;
        }
    },
    onRemoteStreamEnded: function(stream, video) {
        if (video.parentNode && video.parentNode.parentNode && video.parentNode.parentNode.parentNode) {
            video.parentNode.parentNode.parentNode.removeChild(video.parentNode.parentNode);
        }
    },
    onRoomFound: function(room) {
        teacherId = room.sender;
        var alreadyExist = document.querySelector('button[data-broadcaster="' + room.broadcaster + '"]');
        if (alreadyExist) return;

        if (typeof roomsList === 'undefined') roomsList = document.body;

        var tr = document.createElement('tr');
        tr.innerHTML = '<td><button class="join">Join</button></td><td><button class="muteunmute" style="display:none;">Un mute</button></td>';
        roomsList.appendChild(tr);

        var joinRoomButton = tr.querySelector('.join');
        muteunmuteRoomButton = tr.querySelector('.muteunmute');
        joinRoomButton.setAttribute('data-broadcaster', room.broadcaster);
        joinRoomButton.setAttribute('data-roomToken', room.roomToken);

        joinRoomButton.onclick = function() {
            this.disabled = true;
            muteunmuteRoomButton.style.display="block";
            document.getElementById('message_unload').style.display = 'none';

            var broadcaster = this.getAttribute('data-broadcaster');
            var roomToken = this.getAttribute('data-roomToken');
            captureUserMedia(function(stream) {
                conferenceUI.joinRoom({
                    roomToken: roomToken,
                    joinUser: broadcaster
                });
                myStream = stream;
                myStream.getAudioTracks()[0].enabled = false;
            }, function() {
                joinRoomButton.disabled = false;
            });
        };


        muteunmuteRoomButton.onclick = function(){
            muteunmuteRoomButton.disabled = true;
            muteunmuteRoomButton.innerHTML = "Waiting for teacher response.";
            socketConn.emit('unmute-request',{
                to:teacherId,
                from:sender,
                name:name
            });
        };
    },
    onRoomClosed: function(room) {
        var joinButton = document.querySelector('button[data-roomToken="' + room.roomToken + '"]');
        if (joinButton) {
            joinButton.parentNode.parentNode.parentNode.parentNode.removeChild(joinButton.parentNode.parentNode.parentNode);
        }

        $('.media-container').remove();
        document.getElementById('message_unload').style.display = 'block';
        alert('Session is closed from the broadcaster!');
    },
    onReady: function() {
        console.log('now you can open or join rooms');
    }
};

var video = null;


function captureUserMedia(callback, failure_callback) {
    video = document.createElement('video');
    video.muted = true;
    video.volume = 0;

    try {
        video.setAttributeNode(document.createAttribute('autoplay'));
        video.setAttributeNode(document.createAttribute('playsinline'));
        video.setAttributeNode(document.createAttribute('controls'));
    } catch (e) {
        video.setAttribute('autoplay', true);
        video.setAttribute('playsinline', true);
        video.setAttribute('controls', true);
    }

    // video.style.width="200px";
    // video.style.height="200px";

    getUserMedia({
        video: video,
        constraints:{
            audio:true,
            video:false
        },
        onsuccess: function(stream) {
            config.attachStream = stream;

            video.muted = true;
            var mediaElement = getMediaElement(video, {
                width: (videosContainer.clientWidth / 2) - 50,
                buttons: ['mute-audio', 'mute-video', 'full-screen', 'volume-slider']
            });
            mediaElement.toggle('mute-audio');
            mediaElement.style.display="none";

            videosContainer.appendChild(mediaElement);

            callback && callback(stream);
        },
        onerror: function() {
            alert('unable to get access to your webcam');
            callback && callback(vid);
        }
    });
}

var conferenceUI = conference(config);

/* UI specific */
var videosContainer = document.getElementById('videos-container') || document.body;

var roomsList = document.getElementById('rooms-list');

function rotateVideo(video) {
    video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(0deg)';
    setTimeout(function() {
        video.style[navigator.mozGetUserMedia ? 'transform' : '-webkit-transform'] = 'rotate(360deg)';
    }, 1000);
}

(function() {
    var uniqueToken = document.getElementById('unique-token');
    if (uniqueToken)
        if (location.hash.length > 2) uniqueToken.parentNode.parentNode.parentNode.innerHTML = '<h2 style="text-align:center;display: block;"><a href="' + location.href + '" target="_blank">Right click to copy & share this private link</a></h2>';
        else uniqueToken.innerHTML = uniqueToken.parentNode.parentNode.href = '#' + (Math.random() * new Date().getTime()).toString(36).toUpperCase().replace( /\./g , '-');
})();

function scaleVideos() {
    var videos = document.querySelectorAll('video'),
        length = videos.length, video;

    var minus = 130;
    var windowHeight = 700;
    var windowWidth = 600;
    var windowAspectRatio = windowWidth / windowHeight;
    var videoAspectRatio = 4 / 3;
    var blockAspectRatio;
    var tempVideoWidth = 0;
    var maxVideoWidth = 0;

    for (var i = length; i > 0; i--) {
        blockAspectRatio = i * videoAspectRatio / Math.ceil(length / i);
        if (blockAspectRatio <= windowAspectRatio) {
            tempVideoWidth = videoAspectRatio * windowHeight / Math.ceil(length / i);
        } else {
            tempVideoWidth = windowWidth / i;
        }
        if (tempVideoWidth > maxVideoWidth)
            maxVideoWidth = tempVideoWidth;
    }
    for (var i = 0; i < length; i++) {
        video = videos[i];
        if (video)
            video.width = maxVideoWidth - minus;
    }
}

window.onresize = scaleVideos;
