var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var path = require('path');

var port = process.env.PORT || 3000;

app.set('port', port);

app.use(express.static(path.join(__dirname,'node_modules','phaser','dist')));
app.use(express.static(path.join(__dirname,'public')));

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

var players = [];

io.on('connection', function (socket) {
  var addedUser = false;


  socket.on('addPlayer', function(data, callback) {
    console.log('Add Player: '+socket.id);

    console.log("current players: "+ players)

    callback(players)

    data.id = socket.id;
    players.push(data)

    socket.broadcast.emit('playerAdded', data);
  });

  socket.on('move', function (data) {
    for(var i = 0; i < players.length; i++) {
      var player = players[i];

      if(player.id == socket.id) {
        player.x = data.x;
        player.y = data.y
        player.animation = data.animation;
        break;
      }
    }

    data.id = socket.id
    socket.broadcast.emit('move', data);
  });

  socket.on('disconnect', function () {
    console.log("disconnect");

    var index = -1;

    for(var i = 0; i < players.length; i++) {
      if(players[i].id == socket.id) {
        console.log("removing player");
        index = i;
        break;
      }
    }

    if(index > -1) {
      players.splice(i, 1);
    }

    socket.broadcast.emit('removePlayer', {id:socket.id});

  });
});
