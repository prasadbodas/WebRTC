function parseURLParams(url) {
    var queryStart = url.indexOf("?") + 1,
        queryEnd   = url.indexOf("#") + 1 || url.length + 1,
        query = url.slice(queryStart, queryEnd - 1),
        pairs = query.replace(/\+/g, " ").split("&"),
        parms = {}, i, n, v, nv;

    if (query === url || query === "") return;

    for (i = 0; i < pairs.length; i++) {
        nv = pairs[i].split("=", 2);
        n = decodeURIComponent(nv[0]);
        v = decodeURIComponent(nv[1]);

        if (!parms.hasOwnProperty(n)) parms[n] = [];
        parms[n].push(nv.length === 2 ? v : null);
    }
    return parms;
}

var urlString = location.href;
var urlParams = parseURLParams(urlString);
if(!urlParams || !urlParams.channel) {
    location.href = location.href.split('?channel')[0] + '?channel=' + (Math.random() * 100).toString().replace('.', '');
}

document.createElement('article');
document.createElement('footer');

// var SIGNALING_SERVER = 'https://socketio-over-nodejs2.herokuapp.com:443/';
// var SIGNALING_SERVER = 'https://webrtcweb.com:9559/';
// var SIGNALING_SERVER = 'https://video-broadcast.herokuapp.com/';
var SIGNALING_SERVER = '/';