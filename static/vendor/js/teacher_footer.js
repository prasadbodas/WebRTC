var sender = Math.round(Math.random() * 999999999) + 999999999;
var socketConn = null;
const videoElem = document.getElementById("screen-video");
const logElem = document.getElementById("log");
const startElem = document.getElementById("start");
startElem.disabled = true;
const endSess = document.getElementById("end-session");
var video = null;
var myStream = {};
var mediaRecorderCore = null;
var roomFlag = false;

var config = {
    openSocket: function(config) {

        config.channel = config.channel || urlParams.channel[0];
        
        io.connect(SIGNALING_SERVER).emit('new-channel', {
            channel: config.channel,
            sender: sender
        });

        socketConn = io.connect(SIGNALING_SERVER + config.channel);
        var socket = socketConn;
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
            var row = "<tr id='"+data.from+"'><td>"+data.name+" requested for unmute him.</td><td><button class='unmute'>Un mute</button><button class='decline'>Decline</button></td>";
            $("#student-unmute-requests").append(row);
        });
    },
    onRemoteStream: function(media) {
        console.log('onRemoteStream Media: ', media);
        var remoteStream = video.srcObject;
        console.log('onRemoteStream - remoteStream', remoteStream.getTracks() );

        var videoTrack = remoteStream.getVideoTracks();
        if (videoTrack.length > 0) {
          remoteStream.removeTrack(videoTrack[0]);
        }
        console.log('onRemoteStream - audiotrak', remoteStream.getTracks() );

        var mediaElement = getAudioElement(remoteStream, {
            width: (videosContainer.clientWidth / 2) - 50,
            buttons: ['mute-audio', 'mute-video', 'full-screen', 'volume-slider']
        });
        mediaElement.id = media.stream.streamid;
        mediaElement.style.display="none";
        videosContainer.appendChild(mediaElement);
    },
    onRemoteStreamEnded: function(stream, video) {
        if (video.parentNode && video.parentNode.parentNode && video.parentNode.parentNode.parentNode) {
            video.parentNode.parentNode.parentNode.removeChild(video.parentNode.parentNode);
        }
    },
    onRoomClosed: function(room) {
        var joinButton = document.querySelector('button[data-roomToken="' + room.roomToken + '"]');
        if (joinButton) {
            joinButton.parentNode.parentNode.parentNode.parentNode.removeChild(joinButton.parentNode.parentNode.parentNode);
        }
    },
    onReady: function() {

    },
    onRoomFound:function(){}
};

function setupNewRoomButtonClickHandler(type) {
    alert(1);
    if(roomFlag == false){
        //startElem.disabled = true;
        //stopElem.disabled = true;
        // document.getElementById('conference-name').disabled = true;
        captureUserMedia(type, function() {
            conferenceUI.createRoom({
                roomName: 'Anonymous',
                sender:sender
            });
            roomFlag = true;

            sendRecordCore();
        }, function() {
            // btnSetupNewRoom.disabled = document.getElementById('conference-name').disabled = false;
        });
    }else{
        stopCapture();
    }
}

async function captureUserMedia(type, callback, failure_callback) {
    video = document.createElement('video');
    video.muted = false;
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

    btnSetupNewRoom.disabled = true;

    var constraints = {
        audio:true,
        video:true
    };

    // video.style.width="200px";
    // video.style.height="200px";

    getUserMedia({
        video: video,
        constraints: constraints,
        onsuccess: function(stream) {
            startElem.disabled = false;
            endSess.disabled = false;

            config.attachStream = stream;
            myStream = stream;
            video.muted = true;
            var mediaElement = getMediaElement(video, {
                width: (videosContainer.clientWidth / 2) - 50,
                buttons: ['mute-audio', 'mute-video', 'full-screen', 'volume-slider']
            });
            mediaElement.toggle('mute-audio');
            videosContainer.appendChild(mediaElement);
            callback && callback();
        },
        onerror: function() {
            alert('unable to get access to your webcam');
            callback && callback();
        }
    });
}

var conferenceUI = conference(config);

$("body").on("click",".unmute",function(){
    $(this).hide();
    $(this).parents("tr").find(".decline").html("Mute");
    $(this).parents("tr").find(".decline").addClass('mute').removeClass('decline');
    var data = {
        to:$(this).parents("tr").attr("id"),
        type:"unmute"
    };
    socketConn.emit("unmute-request",data);
});

$("body").on("click",".decline",function(){
    $(this).parents("tr").remove();
    var data = {
        to:$(this).parents("tr").attr("id"),
        type:"decline"
    };
    socketConn.emit("unmute-request",data);
});

$("body").on("click",".mute",function(){
    $(this).parents("tr").remove();
    var data = {
        to:$(this).parents("tr").attr("id"),
        type:"mute"
    };
    socketConn.emit("unmute-request",data);
});

/* UI specific */
var videosContainer = document.getElementById('videos-container') || document.body;
var btnSetupNewRoom = document.getElementById('setup-new-room');
// var roomsList = document.getElementById('rooms-list');


if (btnSetupNewRoom) btnSetupNewRoom.onclick = function(){
    alert(1);
    setupNewRoomButtonClickHandler('video');
};

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


// Set event listeners for the start and stop buttons
startElem.addEventListener("click", async function(evt) {
    mediaRecorderCore.stop();
    var displayMediaOptions = {
        video: true,
        audio: false
    };
    var newStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    if(newStream){

        myStream.addTrack(newStream.getVideoTracks()[0]);
        myStream.removeTrack(video.srcObject.getVideoTracks()[0]);

        video.srcObject = myStream;
        video.muted = false;

        var screenVideoTrack = video.srcObject.getVideoTracks()[0];

        conferenceUI.updateStream(screenVideoTrack, myStream);

        startElem.disabled = true;
        btnSetupNewRoom.disabled = false;
        endSess.disabled = false;

        sendRecordCore();

        video.muted = true;
    }
}, false);

async function stopCapture() {
    mediaRecorderCore.stop();
    var displayMediaOptions = {
        video: true,
        audio: true
    };
    var newStream = await navigator.mediaDevices.getUserMedia(displayMediaOptions);
    if(newStream){

        myStream.removeTrack(video.srcObject.getVideoTracks()[0]);
        myStream.addTrack(newStream.getVideoTracks()[0]);

        video.srcObject = myStream;
        video.muted = false;
        var screenVideoTrack = video.srcObject.getVideoTracks()[0];
        conferenceUI.updateStream(screenVideoTrack,myStream);

        startElem.disabled = false;
        btnSetupNewRoom.disabled = true;
        endSess.disabled = false;

        sendRecordCore();


        video.muted = true;
    }
}

function dumpOptionsInfo(videoStream) {
    //btnSetupNewRoom.disabled = true;
    startElem.disabled = true;
    //stopElem.disabled = false;
    //const videoStream = videoElem.srcObject;

    config.attachStream = videoStream;
    conferenceUI.createRoom({
        roomName: 'Anonymous',
        sender:sender
    });
}


function sendRecord(){
    var captureStream = video.srcObject;
    mediaRecorder = new MediaStreamRecorder(captureStream);
    mediaRecorder.mimeType = 'video/mp4';
    mediaRecorder.ondataavailable = function (blob) {
        var reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = function(event) {
            // socketConn.emit('video-stream', {
            //     sender: sender,
            //     stream: event.target.result,
            //     channel: urlParams.channel[0]
            // });

            $.ajax({
              url: 'http://localhost/tools/lms/save.php',
              type: 'POST',
              async: false,
              data: {
                    sender: sender,
                    stream: event.target.result,
                    channel: urlParams.channel[0]
                },
                crossDomain: true,
            }).done(function( data ) {
                console.log(data);
                console.log('saved! ' + da);
            });
        };
    };
    mediaRecorder.start(5 * 1000);

}

var ondataavailable_count = 0;
var da = 1;
function sendRecordCore(){
    mediaRecorderCore = null;
    var options = {
        mimeType : 'video/webm;codecs=vp8',
        //audioBitsPerSecond: 2000000, // 1 Mbps
        //bitsPerSecond: 2500000      // 2 Mbps
    }
    var captureStream = video.srcObject;
    mediaRecorderCore = new MediaRecorder(captureStream, options);
    da++;
    mediaRecorderCore.ondataavailable = function (dataavailable) {
        console.log(' Recorded chunk of size ' + (dataavailable.data.size / 1024) / 1024 + " MB");
        var reader = new FileReader();
        reader.readAsDataURL(dataavailable.data);
        reader.onload = function(event) {
            // socketConn.emit('video-stream', {
            //     sender: sender,
            //     stream: event.target.result,
            //     channel: urlParams.channel[0] + '-' + da
            // });

            $.ajax({
              //url: 'http://localhost/lms/recording/save.php',
              url: 'https://einscriptions.com/recording/save.php',
              type: 'POST',
            //   async: false,
              data: {
                    sender: sender,
                    stream: event.target.result,
                    channel: urlParams.channel[0] + '-' + da
                },
                crossDomain: true,
            }).done(function( data ) {
                console.log(data);
                console.log('saved! ' + da);
            });
        };
        ondataavailable_count++;
    };
    mediaRecorderCore.start(10 * 1000);

    // console.log('mediaRecorderCore', mediaRecorderCore);
}

endSess.onclick = function(){
    beforeunload_trigger();
}

$(window).bind("beforeunload", function() {
    beforeunload_trigger();
});

function beforeunload_trigger(){
    if(confirm("Are you sure, want to end this session?")){
        mediaRecorderCore.stop();
        myStream.getTracks().forEach(function(track) {
            track.stop();
        });

        conferenceUI.leaveRoom();
        $('.media-container').remove();
        btnSetupNewRoom.disabled = false;
        endSess.disabled = true;
        startElem.disabled = true;

        //initiate video merging in 10SEC after end session in new tab
        //setTimeout(function(){
            $.ajax({
                //url: 'http://localhost/lms/recording/merge-videos.php?roomid=' + urlParams.channel[0],
                url: 'https://einscriptions.com/api/?action=user&actionMethod=update_video_status&video_id='+urlParams.channel[0]+'&session_status=1',
                type: 'GET',
                crossDomain: true,
            }).done(function( data ) {
                console.log(data);
                console.log('saved! ' + da);
            });
        //}, 10 * 1000);
    }
}

//Refresh page after (60SEC * 60MIN * 3HRS) * 1000MS
// setTimeout(function(){
//     window.location.reload();
// }, (60 * 60 * 3) * 1000);
