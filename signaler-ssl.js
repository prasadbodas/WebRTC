var fs = require('fs');
const https = require('https');
const util = require('util')

var _static = require('node-static');
var file = new _static.Server('./static', {
    cache: false
});

/*
// use this for LIVE domains
var options = {
    key: fs.readFileSync('../ssl/private/domain.com.key'),
    cert: fs.readFileSync('../ssl/certs/domain.com.crt'),
    ca: fs.readFileSync('../ssl/certs/domain.com.cabundle')
};
*/
var options = {
    key: fs.readFileSync('fake-keys/privatekey.pem'),
    cert: fs.readFileSync('fake-keys/certificate.pem')
};

var app = https.createServer(options, serverCallback);

function serverCallback(request, response) {
    request.addListener('end', function () {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        file.serve(request, response);
    }).resume();
}

var io = require('socket.io').listen(app, {
    log: true,
    origins: '*:*'
});

io.set('transports', [
    'websocket',
    // 'xhr-polling',
    // 'jsonp-polling'
]);

var channels = {};
var users = {};
io.sockets.on('connection', function (socket) {

    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    socket.on('new-channel', function (data) {
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }

        console.log('from new-channel', data.channel);
        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        var isChannelPresent = !!channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        if (initiatorChannel) {
            delete channels[initiatorChannel];
        }
    });
});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        var username;
        if (io.isConnected) {
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            console.log('on message', data.sender + ' == ' + sender);
            if (data.sender == sender) {
                if (!username) username = data.data.sender;

                socket.broadcast.emit('message', data.data);
            }
            socket.sender = data.sender;
            users[data.sender] = socket;
            console.log(Object.keys(users));
        });

        socket.on('video-stream', function (data) {
            if (data.sender == sender) {
                var fileName = data.channel;
                console.log('channel - ' + fileName);
                //writeToDisk(data.stream, fileName + '.webm');
                //writeToS3(data.stream, fileName + '.webm', data.partNumber);
            }
        });

        socket.on('unmute-request', function (data) {
            //console.log('unmute-request ' + data);
            console.log(Object.keys(users));
            if (data.to && users[data.to]) {
                users[data.to].emit('unmute-request', data);
            }
        });

        socket.on('disconnect', function () {
            if (username) {
                socket.broadcast.emit('user-left', username);
                username = null;
            }
            if (socket.sender && users[socket.sender]) {
                delete users[socket.sender];
            }
        });
    });
}

app.listen(process.env.PORT || 3000);

function writeToDisk(dataURL, fileName) {
    var fileExtension = fileName.split('.').pop(),
        fileRootNameWithBase = __dirname + '/uploads/' + fileName,
        filePath = fileRootNameWithBase,
        fileID = 2,
        fileBuffer;
    //console.log('filePath', filePath);

    // @todo return the new filename to client
    // while (fs.existsSync(filePath)) {
    //     filePath = fileRootNameWithBase + '(' + fileID + ').' + fileExtension;
    //     fileID += 1;
    // }

    dataURL = dataURL.split(',').pop();
    fileBuffer = new Buffer(dataURL, 'base64');

    fs.appendFileSync(filePath, fileBuffer, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    });
}

function writeToS3(dataURL, fileName) {
    const s3 = new AWS.S3({
        accessKeyId: 'AKIAQYXWOFWIGGCPHFAW',
        secretAccessKey: '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'
    });

    const params = {
        Bucket: 'lms-call-recordings',
        Key: fileName, // file will be saved as given in var fileName
        Body: dataURL
    };
    console.log('before s3.upload');
    s3.upload(params, function (s3Err, data) {
        console.log(JSON.stringify(data));
        if (s3Err) throw s3Err
        console.log(`File uploaded successfully at ${data.Location}`)
    });
}