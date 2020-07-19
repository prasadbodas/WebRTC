(function(window, document, red5prosdk) {
  'use strict';

  var SharedObject = red5prosdk.Red5ProSharedObject;
  var so = undefined; // @see onPublishSuccess
  var isPublishing = false;

  var serverSettings = (function() {
    var settings = sessionStorage.getItem('r5proServerSettings');
    try {
      return JSON.parse(settings);
    }
    catch (e) {
      console.error('Could not read server settings from sessionstorage: ' + e.message);
    }
    return {};
  })();

  var configuration = (function () {
    var conf = sessionStorage.getItem('r5proTestBed');
    try {
      return JSON.parse(conf);
    }
    catch (e) {
      console.error('Could not read testbed configuration from sessionstorage: ' + e.message);
    }
    return {}
  })();
  red5prosdk.setLogLevel(configuration.verboseLogging ? red5prosdk.LOG_LEVELS.TRACE : red5prosdk.LOG_LEVELS.WARN);

  var updateStatusFromEvent = window.red5proHandlePublisherEvent; // defined in src/template/partial/status-field-publisher.hbs

  var targetPublisher;
  var roomName = window.query('channel') || 'red5pro'; // eslint-disable-line no-unused-vars
  //var streamName = window.query('streamName') || ['publisher', Math.floor(Math.random() * 0x10000).toString(16)].join('-');
  var streamName = roomName;

  //start broadcast emit
  var sender = Math.round(Math.random() * 999999999) + 999999999;
  var roomToken = uniqueToken();
  var userToken = uniqueToken();
  
  io.connect('/').emit('new-channel', {
      channel: roomName,
      sender: sender
  });
  var socket = io.connect('/' + roomName);
  socket.on('connect', function () {
      console.log('now you can open or join rooms');
  });
  //var count = 1;
  function emitMessage(){
    //if(count >= 10) return;
    console.log('from emitMessage');
    socket.emit('message', {
        sender: sender,
        data: {
            roomToken: roomToken,
            roomName: roomName,
            broadcaster: userToken,
            sender: sender,
            type: 'teacher'
        }
    });
    setTimeout(emitMessage, 3000);
    //count++;
  }
  var studentUnmuteTable = document.getElementById('student-unmute-requests');
  socket.on("unmute-request",function(data){
    var row = "<tr id='"+data.from+"'><td>"+data.name+" requested for unmute him.</td><td><button class='btn btn-sm btn-primary unmute'>Un mute</button><button class='btn btn-sm btn-danger decline'>Decline</button></td>";
    studentUnmuteTable.innerHTML = studentUnmuteTable.innerHTML + row;
  });

  $("body").on("click",".unmute",function(){
    $(this).hide();
    $(this).parents("tr").find(".decline").html("Mute");
    $(this).parents("tr").find(".decline").addClass('mute').removeClass('decline');
    var data = {
        to:$(this).parents("tr").attr("id"),
        type:"unmute"
    };
    socket.emit("unmute-request",data);
  });

  $("body").on("click",".decline",function(){
    $(this).parents("tr").remove();
    var data = {
        to:$(this).parents("tr").attr("id"),
        type:"decline"
    };
    socket.emit("unmute-request",data);
  });

  $("body").on("click",".mute",function(){
      $(this).parents("tr").remove();
      var data = {
          to:$(this).parents("tr").attr("id"),
          type:"mute"
      };
      socket.emit("unmute-request",data);
  });

  var roomField = document.getElementById('room-field');
  var publisherContainer = document.getElementById('publisher-container');
  var publisherMuteControls = document.getElementById('publisher-mute-controls');
  var publisherSession = document.getElementById('publisher-session');
  var publisherNameField = document.getElementById('publisher-name-field');
  var streamNameField = document.getElementById('streamname-field');
  var publisherVideo = document.getElementById('red5pro-publisher');
  var audioCheck = document.getElementById('audio-check');
  var videoCheck = document.getElementById('video-check');
  var joinButton = document.getElementById('join-button');
  var statisticsField = document.getElementById('statistics-field');

  var startButton = document.getElementById('start-con');
  const startCaptureElem = document.getElementById("capture-button");
  var membersEle = document.getElementById('members-count');

  roomField.value = roomName;
  streamNameField.value = streamName;
  audioCheck.checked = configuration.useAudio;
  videoCheck.checked = configuration.useVideo;

  joinButton.addEventListener('click', function () {
    saveSettings();
    doPublish(streamName);
    setPublishingUI(streamName);
  });

  audioCheck.addEventListener('change', updateMutedAudioOnPublisher);
  videoCheck.addEventListener('change', updateMutedVideoOnPublisher);

  var soField = document.getElementById('so-field');

  var protocol = serverSettings.protocol;
  var isSecure = protocol == 'https';

  function saveSettings () {
    streamName = streamNameField.value;
    roomName = roomField.value;
  }

  function updateMutedAudioOnPublisher () {
    if (targetPublisher && isPublishing) {
      if (audioCheck.checked) { 
        if (videoTrackClone) {
          var c = targetPublisher.getPeerConnection();
          var senders = c.getSenders();
          senders[0].replaceTrack(audioTrackClone);
          audioTrackClone = undefined;
        } else {
          targetPublisher.unmuteAudio();
        }
      } else { 
        targetPublisher.muteAudio(); 
      }
    }
  }

  function updateMutedVideoOnPublisher () {
    if (targetPublisher && isPublishing) {
      if (videoCheck.checked) {
        if (videoTrackClone) {
          var c = targetPublisher.getPeerConnection();
          var senders = c.getSenders();
          senders[1].replaceTrack(videoTrackClone);
          videoTrackClone = undefined;
        } else {
          targetPublisher.unmuteVideo();
        }
      } else { 
        targetPublisher.muteVideo(); 
      }
    }
    !videoCheck.checked && showVideoPoster();
    videoCheck.checked && hideVideoPoster();
  }

  var audioTrackClone;
  var videoTrackClone;
  function updateInitialMediaOnPublisher () {
    var t = setTimeout(function () {
      // If we have requested no audio and/or no video in our initial broadcast,
      // wipe the track from the connection.
      var audioTrack = targetPublisher.getMediaStream().getAudioTracks()[0];
      var videoTrack = targetPublisher.getMediaStream().getVideoTracks()[0];
      var connection = targetPublisher.getPeerConnection();
      if (!videoCheck.checked) {
        videoTrackClone = videoTrack.clone();
        connection.getSenders()[1].replaceTrack(null);
      }
      if (!audioCheck.checked) {
        audioTrackClone = audioTrack.clone();
        connection.getSenders()[0].replaceTrack(null);
      }
      clearTimeout(t);
    }, 2000); 
    // a bit of a hack. had to put a timeout to ensure the video track bits at least started flowing :/
  }

  function showVideoPoster () {
    publisherVideo.classList.add('hidden');
  }

  function hideVideoPoster () {
    publisherVideo.classList.remove('hidden');
  }

  function getSocketLocationFromProtocol () {
    return !isSecure
      ? {protocol: 'ws', port: serverSettings.wsport}
      : {protocol: 'wss', port: serverSettings.wssport};
  }

  var bitrateTrackingTicket;
  function onBitrateUpdate (bitrate, packetsSent) {
    statisticsField.innerText = 'Bitrate: ' + Math.floor(bitrate) + '. Packets Sent: ' + packetsSent + '.';
  }

  function onPublisherEvent (event) {
    console.log('[Red5ProPublisher] ' + event.type + '.');
    if (event.type === 'WebSocket.Message.Unhandled') {
      console.log(event);
    } else if (event.type === red5prosdk.RTCPublisherEventTypes.MEDIA_STREAM_AVAILABLE) {
      window.allowMediaStreamSwap(targetPublisher, targetPublisher.getOptions().mediaConstraints, document.getElementById('red5pro-publisher'));
      window.screenShare(targetPublisher);
      window.toVideo(targetPublisher);
    }
    updateStatusFromEvent(event);
  }
  function onPublishFail (message) {
    isPublishing = false;
    console.error('[Red5ProPublisher] Publish Error :: ' + message);
  }
  function onPublishSuccess (publisher) {
    isPublishing = true;
    window.red5propublisher = publisher;
    console.log('[Red5ProPublisher] Publish Complete.');
    establishSharedObject(publisher, roomField.value, streamNameField.value);

    try {
      bitrateTrackingTicket = window.trackBitrate(publisher.getPeerConnection(), onBitrateUpdate, null, null, true);
    }
    catch (e) {
      // no tracking for you!
    }
  }
  function onUnpublishFail (message) {
    isPublishing = false;
    console.error('[Red5ProPublisher] Unpublish Error :: ' + message);
  }
  function onUnpublishSuccess () {
    isPublishing = false;
    console.log('[Red5ProPublisher] Unpublish Complete.');
  }

  function getAuthenticationParams () {
    var auth = configuration.authentication;
    return auth && auth.enabled
      ? {
        connectionParams: {
          username: auth.username,
          password: auth.password
        }
      }
      : {};
  }

  function getUserMediaConfiguration () {
    return {
      mediaConstraints: {
        audio: configuration.useAudio ? configuration.mediaConstraints.audio : true,
        video: configuration.useVideo ? configuration.mediaConstraints.video : false
      }
    };
  }

  function setPublishingUI (streamName) {
    publisherNameField.innerText = streamName;
    roomField.setAttribute('disabled', true);
    publisherSession.classList.remove('hidden');
    publisherNameField.classList.remove('hidden');
    publisherMuteControls.classList.remove('hidden');
    Array.prototype.forEach.call(document.getElementsByClassName('remove-on-broadcast'), function (el) {
      el.classList.add('hidden');
    });
  }

  function updatePublishingUIOnStreamCount (streamCount) {
    if (streamCount > 0) {
      publisherContainer.classList.remove('auto-margined');
      publisherContainer.classList.add('spaced');
      publisherContainer.classList.add('float-left');
    } else {
      publisherContainer.classList.add('auto-margined');
      publisherContainer.classList.remove('spaced');
      publisherContainer.classList.remove('float-left');
    }
  }

  var hasRegistered = false;
  function appendMessage (message) {
    soField.value = [message, soField.value].join('\n');
  }
  // Invoked from METHOD_UPDATE event on Shared Object instance.
  function messageTransmit (message) { // eslint-disable-line no-unused-vars
    soField.value = ['User "' + message.user + '": ' + message.message, soField.value].join('\n');
  }
  function establishSharedObject (publisher, roomName, streamName) {
    // Create new shared object.
    so = new SharedObject(roomName, publisher)
    var soCallback = {
      messageTransmit: messageTransmit
    };
    so.on(red5prosdk.SharedObjectEventTypes.CONNECT_SUCCESS, function (event) { // eslint-disable-line no-unused-vars
      console.log('[Red5ProPublisher] SharedObject Connect.');
      appendMessage('Connected.');
    });
    so.on(red5prosdk.SharedObjectEventTypes.CONNECT_FAILURE, function (event) { // eslint-disable-line no-unused-vars
      console.log('[Red5ProPublisher] SharedObject Fail.');
    });
    so.on(red5prosdk.SharedObjectEventTypes.PROPERTY_UPDATE, function (event) {
      console.log('[Red5ProPublisher] SharedObject Property Update.');
      console.log(JSON.stringify(event.data, null, 2));
      if (event.data.hasOwnProperty('streams')) {
        appendMessage('Stream list is: ' + event.data.streams + '.');
        console.log('Stream list is: ', event.data.streams);

        membersEle.innerHTML = event.data.streams.split(',').length - 1;

        var streams = event.data.streams.length > 0 ? event.data.streams.split(',') : [];
        if (!hasRegistered) {
          hasRegistered = true;
          so.setProperty('streams', streams.concat([streamName]).join(','));
        }
        streamsPropertyList = streams;
        processStreams(streamsPropertyList, streamName);
      }
      else if (!hasRegistered) {
        hasRegistered = true;
        streamsPropertyList = [streamName];
        so.setProperty('streams', streamName);
      }
    });
    so.on(red5prosdk.SharedObjectEventTypes.METHOD_UPDATE, function (event) {
      console.log('[Red5ProPublisher] SharedObject Method Update.');
      console.log(JSON.stringify(event.data, null, 2));
      soCallback[event.data.methodName].call(null, event.data.message);
    });
  }

  function determinePublisher () {

    var config = Object.assign({},
                      configuration,
                      {
                        streamMode: configuration.recordBroadcast ? 'record' : 'live'
                      },
                      getAuthenticationParams(),
                      getUserMediaConfiguration());

    var rtcConfig = Object.assign({}, config, {
                      protocol: getSocketLocationFromProtocol().protocol,
                      port: getSocketLocationFromProtocol().port,
                      bandwidth: {
                        video: 512
                      },
                      mediaConstraints: {
                        audio: true,
                        video: {
                          width: {
                            exact: 480
                          },
                          height: {
                            exact: 360
                          },
                          frameRate: {
                            exact: 500
                          }
                        }
                      },
                      streamName: streamName
                   });

    var publisher = new red5prosdk.RTCPublisher();
    return publisher.init(rtcConfig);

  }

  function doPublish (name) {
    targetPublisher.publish(name)
      .then(function () {
        onPublishSuccess(targetPublisher);
        updateInitialMediaOnPublisher();

        emitMessage();
      })
      .catch(function (error) {
        var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
        console.error('[Red5ProPublisher] :: Error in publishing - ' + jsonError);
        console.error(error);
        onPublishFail(jsonError);
       });
  }

  function unpublish () {
    if (so !== undefined)  {
      var name = streamName;
      var updateList = streamsPropertyList.filter(function (item) {
        return item !== name;
      });
      streamsPropertyList = updateList;
      so.setProperty('streams', updateList.join(','));
      so.close();
    }
    return new Promise(function (resolve, reject) {
      var publisher = targetPublisher;
      publisher.unpublish()
        .then(function () {
          onUnpublishSuccess();
          resolve();
        })
        .catch(function (error) {
          var jsonError = typeof error === 'string' ? error : JSON.stringify(error, 2, null);
          onUnpublishFail('Unmount Error ' + jsonError);
          reject(error);
        });
    });
  }

  startButton.onclick = function(){
    // Kick off.
    determinePublisher()
      .then(function (publisherImpl) {
        targetPublisher = publisherImpl;
        targetPublisher.on('*', onPublisherEvent);
        startButton.disabled = true;
        startCaptureElem.disabled = false;
        return targetPublisher.preview();
      })
      .catch(function (error) {
        var jsonError = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
        console.error('[Red5ProPublisher] :: Error in publishing - ' + jsonError);
        console.error(error);
        onPublishFail(jsonError);
      });

      setTimeout(function(){
        joinButton.click();
      }, 500);
  };
  
  var shuttingDown = false;
  function shutdown () {
    if (shuttingDown) return;
    shuttingDown = true;
    function clearRefs () {
      if (targetPublisher) {
        targetPublisher.off('*', onPublisherEvent);
      }
      targetPublisher = undefined;
    }
    unpublish().then(clearRefs).catch(clearRefs);
    window.untrackBitrate(bitrateTrackingTicket);
  }
  window.addEventListener('beforeunload', shutdown);
  window.addEventListener('pagehide', shutdown);

  var streamsPropertyList = [];
  var subscribersEl = document.getElementById('subscribers');
  function processStreams (streamlist, exclusion) {
    var nonPublishers = streamlist.filter(function (name) {
      return name !== exclusion;
    });
    var list = nonPublishers.filter(function (name, index, self) {
      return (index == self.indexOf(name)) &&
        !document.getElementById(window.getConferenceSubscriberElementId(name));
    });
    var subscribers = list.map(function (name, index) {
      return new window.ConferenceSubscriberItem(name, subscribersEl, index);
    });
    var i, length = subscribers.length - 1;
    var sub;
    for(i = 0; i < length; i++) {
      sub = subscribers[i];
      sub.next = subscribers[sub.index+1];
    }
    if (subscribers.length > 0) {
      var baseSubscriberConfig = Object.assign({},
                                  configuration,
                                  {
                                    protocol: getSocketLocationFromProtocol().protocol,
                                    port: getSocketLocationFromProtocol().port
                                  },
                                  getAuthenticationParams(),
                                  getUserMediaConfiguration());
      subscribers[0].execute(baseSubscriberConfig);
    }

    updatePublishingUIOnStreamCount(nonPublishers.length);
  }

  function uniqueToken() {
        var s4 = function() {
            return Math.floor(Math.random() * 0x10000).toString(16);
        };
        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    }

})(this, document, window.red5prosdk);

