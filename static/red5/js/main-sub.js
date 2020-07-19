(function (red5prosdk) {

  // Create a new instance of the WebRTC subcriber.
  var subscriber = new red5prosdk.RTCSubscriber();

  // Initialize
  subscriber.init({
    protocol: 'ws',
    port: 5080,
    host: 'localhost',
    app: 'live',
    streamName: 'mystream',
    rtcConfiguration: {
      iceServers: [{urls: 'stun:stun2.l.google.com:19302'}],
      iceCandidatePoolSize: 2,
      bundlePolicy: 'max-bundle'
    }, // See https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/RTCPeerConnection#RTCConfiguration_dictionary
    mediaElementId: 'red5pro-subscriber',
    subscriptionId: 'mystream' + Math.floor(Math.random() * 0x10000).toString(16),
    videoEncoding: 'NONE',
    audioEncoding: 'NONE'
  })
  .then(function(subscriber) {
    // `subcriber` is the WebRTC Subscriber instance.
    return subscriber.subscribe();
  })
  .then(function(subscriber) {
    // subscription is complete.
    // playback should begin immediately due to
    //   declaration of `autoplay` on the `video` element.
  })
  .catch(function(error) {
    // A fault occurred while trying to initialize and playback the stream.
    console.error(error)
  });

})(window.red5prosdk);