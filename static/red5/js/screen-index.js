// Chrome & Firefox
// Firefox needs to be over https - no localhost support.
// Required: https://www.webrtc-experiment.com/getScreenId/
// @see 

(function(window, document, red5prosdk, getScreenId) {
  'use strict';
  const startVideoElem = document.getElementById("start-con");
  const startCaptureElem = document.getElementById("capture-button");
  const publisherVideo = document.getElementById('red5pro-publisher');
  startCaptureElem.disabled = true;

  function screenShare(targetPublisher){
    startCaptureElem.addEventListener("click", async function(evt) {
      var connection = targetPublisher.getPeerConnection();
      var senders = connection.getSenders();
      
      var displayMediaOptions = {
            video: true,
            audio: false
        };
      var screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      if(screenStream){
        var tracks = screenStream.getTracks();
        var videoTrack = tracks.filter(function (track) { return track.kind === 'video' });
        var i = videoTrack.length;
        console.log(senders);
        //for(x in senders){
          //console.log(x);
            //if (senders[].track.kind === 'video') {
              senders[1].replaceTrack(videoTrack[0]);
            //}
          
        //}

        publisherVideo.srcObject = screenStream;

        startVideoElem.classList.add("to-video");
        startCaptureElem.disabled = true;
        startVideoElem.disabled = false;
      }

    }, false);
  }

  function toVideo(targetPublisher){
    startVideoElem.addEventListener("click", async function(evt) {
      if(startVideoElem.classList.contains("to-video")){
      
        var connection = targetPublisher.getPeerConnection();
        var senders = connection.getSenders();
        
        var displayMediaOptions = {
          video: true,
          audio: true
        };
        var videoStream = await navigator.mediaDevices.getUserMedia(displayMediaOptions);
        if(videoStream){
          var tracks = videoStream.getTracks();
          var videoTrack = tracks.filter(function (track) { return track.kind === 'video' });
          var i = videoTrack.length;
          console.log(senders);
          //for(x in senders){
            //console.log(x);
              //if (senders[].track.kind === 'video') {
                senders[1].replaceTrack(videoTrack[0]);
              //}
            
          //}

          publisherVideo.srcObject = videoStream;

          startCaptureElem.disabled = false;
          startVideoElem.disabled = true;
        }
      }

    }, false);
  }

  window.screenShare = screenShare;
  window.toVideo = toVideo;

})(this, document, window.red5prosdk, window.getScreenId);
