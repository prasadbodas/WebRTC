var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

io.on('connection', function(socket){
    socket.on("add-user",function(data){
        console.log(data);
    });
});

http.listen(82, function(){
  console.log('listening on *:82');
});