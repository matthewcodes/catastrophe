(function(){

  var socket = io();
  var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
  var player;
  var otherPlayers = []
  var platforms;
  var cursors;

  var stars;
  var score = 0;
  var scoreText;

  function preload() {

      game.load.image('sky', 'assets/sky.png');
      game.load.image('ground', 'assets/platform.png');
      game.load.image('star', 'assets/star.png');
      game.load.spritesheet('dude', 'assets/dude.png', 32, 48);

  }

  socket.on('move', function (data) {
     var otherPlayer = otherPlayers[data.id];

     if(otherPlayer) {
       otherPlayer.x = data.x
       otherPlayer.y = data.y
       otherPlayer.animation = data.animation
       otherPlayer.needsUpdated = true
     }
  });

  socket.on('playerAdded', function(data) {
    data.needsAdded = true
    otherPlayers[data.id] = data;
  })

  function create() {

      //  We're going to be using physics, so enable the Arcade Physics system
      game.physics.startSystem(Phaser.Physics.ARCADE);

      //  A simple background for our game
      game.add.sprite(0, 0, 'sky');

      //  The platforms group contains the ground and the 2 ledges we can jump on
      platforms = game.add.group();

      //  We will enable physics for any object that is created in this group
      platforms.enableBody = true;

      // Here we create the ground.
      var ground = platforms.create(0, game.world.height - 64, 'ground');

      //  Scale it to fit the width of the game (the original sprite is 400x32 in size)
      ground.scale.setTo(2, 2);

      //  This stops it from falling away when you jump on it
      ground.body.immovable = true;

      //  Now let's create two ledges
      var ledge = platforms.create(400, 400, 'ground');
      ledge.body.immovable = true;

      ledge = platforms.create(-150, 250, 'ground');
      ledge.body.immovable = true;

      // The player and its settings
      player = game.add.sprite(32, game.world.height - 150, 'dude');

      //  We need to enable physics on the player
      game.physics.arcade.enable(player);

      //  Player physics properties. Give the little guy a slight bounce.
      player.body.bounce.y = 0.2;
      player.body.gravity.y = 300;
      player.body.collideWorldBounds = true;

      //  Our two animations, walking left and right.
      player.animations.add('left', [0, 1, 2, 3], 10, true);
      player.animations.add('right', [5, 6, 7, 8], 10, true);

      //  Finally some stars to collect
      stars = game.add.group();

      //  We will enable physics for any star that is created in this group
      stars.enableBody = true;

      //  Here we'll create 12 of them evenly spaced apart
      for (var i = 0; i < 12; i++)
      {
          //  Create a star inside of the 'stars' group
          var star = stars.create(i * 70, 0, 'star');

          //  Let gravity do its thing
          star.body.gravity.y = 300;

          //  This just gives each star a slightly random bounce value
          star.body.bounce.y = 0.7 + Math.random() * 0.2;
      }

      //  The score
      scoreText = game.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' });

      //  Our controls.
      cursors = game.input.keyboard.createCursorKeys();

      socket.emit('addPlayer', {'x':player.body.x, 'y':player.body.y}, function(players) {

        console.log("hello");

        for (var id in players) {
          var otherPlayer = players[id];
          otherPlayer.needsAdded = true
          otherPlayers[otherPlayer.id] = otherPlayer;
        }
      });

  }

  function update() {

      for (var id in otherPlayers) {
          var otherPlayer = otherPlayers[id];
          if(otherPlayer.needsAdded) {
            otherPlayer.needsAdded = false
            otherPlayer.player = game.add.sprite(otherPlayer.x, otherPlayer.y, 'dude');
            otherPlayer.player.animations.add('left', [0, 1, 2, 3], 10, true);
            otherPlayer.player.animations.add('right', [5, 6, 7, 8], 10, true);
            otherPlayer.player.frame = 4
          } else if(otherPlayer.needsUpdated) {
            otherPlayer.needsUpdated = false
            otherPlayer.player.x = otherPlayer.x;
            otherPlayer.player.y = otherPlayer.y

            if(otherPlayer.animation == "left") {
              otherPlayer.player.animations.play("left");
            } else if(otherPlayer.animation == "right") {
              otherPlayer.player.animations.play("right");
            } else if(otherPlayer.animation == "stop") {
              otherPlayer.player.animations.stop();
              otherPlayer.player.frame = 4;
            }

          }
      }

      //  Collide the player and the stars with the platforms
      game.physics.arcade.collide(player, platforms);
      game.physics.arcade.collide(stars, platforms);

      //  Checks to see if the player overlaps with any of the stars, if he does call the collectStar function
      game.physics.arcade.overlap(player, stars, collectStar, null, this);

      //  Reset the players velocity (movement)
      player.body.velocity.x = 0;

      var animation = ""

      if (cursors.left.isDown)
      {
          //  Move to the left
          player.body.velocity.x = -150;

          animation = "left";
          player.animations.play(animation);
      }
      else if (cursors.right.isDown)
      {
          //  Move to the right
          player.body.velocity.x = 150;

          animation = "right";
          player.animations.play(animation);
      }
      else
      {
          //  Stand still
          player.animations.stop();
          animation = "stop";

          player.frame = 4;
      }

      //  Allow the player to jump if they are touching the ground.
      if (cursors.up.isDown && player.body.touching.down)
      {
          player.body.velocity.y = -350;
      }

      if(player.body.x != player.previousPosition.x || player.body.y != player.previousPosition.y || (animation == "stop" && player.previousAnimation != "stop")) {
        socket.emit('move', {'x':player.body.x, 'y':player.body.y, 'animation':animation});
        player.previousAnimation = animation
      }

  }

  function collectStar (player, star) {

      // Removes the star from the screen
      star.kill();

      //  Add and update the score
      score += 10;
      scoreText.text = 'Score: ' + score;

  }

})();
