"use strict"
//Game objects
var player = {angle:270};
var players = []; // other players
var asteroids = [];
var resources = [];
var canvas = $("#game-canvas")[0];
var ctx = canvas.getContext("2d");
var keyState = {};
var curRotation = 0;
var socket;
var frameDelay = 25;

// Load images
var spaceshipStationary = new Image();
var spaceshipLeft = new Image();
var spaceshipRight = new Image();
var spaceshipForward = new Image();
var asteroidImage = new Image;
var resourceImage = new Image;
spaceshipStationary.src = 'images/FirstSpace_NoFlame.png';
spaceshipLeft.src = 'images/FirstSpace_RightFlame.png';
spaceshipRight.src = 'images/FirstSpace_LeftFlame.png';
spaceshipForward.src = 'images/FirstSpace.png';
var spaceship = [spaceshipStationary,spaceshipLeft,spaceshipRight,spaceshipForward]; // useful format
asteroidImage.src = 'images/Asteroid.png';
resourceImage.src = 'images/Resource.png';

//var audio = new Audio('audio_file.mp3');
//audio.play();

//Utilities
var usedKeys = [37, 38, 39, 40];
var KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
}
var TO_RADIANS = Math.PI/180; 

$(function() {
	canvas.height = $(window).height();
	canvas.width = $(window).width();
	
	registerSocketHooks();
	
	//Start timed canvas updates for UI
	setInterval(updateCanvas, frameDelay);
	
	window.addEventListener('keydown',function(e){
		if (usedKeys.indexOf(e.which) != -1 && !keyState[e.which]) {
			keyState[e.which] = true;
			socket.emit('keyupdate', keyState);
		}
    },true);
    window.addEventListener('keyup',function(e){
		if (usedKeys.indexOf(e.which) != -1 && keyState[e.which]) {
			keyState[e.which] = false;
			socket.emit('keyupdate', keyState);
		}
    },true);
});

function registerSocketHooks() {
	//socket.emit('name', object);
	//socket.on('name', function to handle object);
	
	//Join player to game
	socket = io();
	
	//Hooks for websocket
	socket.on('player', function(p) {
		player = p;
	})
	socket.on('players', function(p) {
		players = p;
	})
	socket.on('gamedata', function(obj) {
		players = obj.players;
		asteroids = obj.asteroids;
		resources = obj.resources;
	})
	socket.on('ping', function(p){
      socket.emit('ping response',p);
    });
}

function getLocalCoords(x, y) {
	// Return coordinates for the user's canvas based when
	// given global coordinates.
	return {
		x:canvas.width/2 - (player.x-x),
		y:canvas.height/2 - (player.y-y)
	};
}

function updateCanvas() {
	var curSpaceship = spaceshipStationary;
	var p = player;
	
	//Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	//Work out rotation
	if (keyState[KEY_CODES.LEFT]) {
		curSpaceship = spaceshipLeft;
		p.angle = (p.angle - p.rotationSpeed*(frameDelay/1000)) % 360;
      	if (p.angle < 0) p.angle += 360;
	} else if (keyState[KEY_CODES.RIGHT]) {
		curSpaceship = spaceshipRight;
		p.angle = (p.angle + p.rotationSpeed*(25/1000)) % 360;
      	if (p.angle < 0) p.angle += 360;
	} else if (keyState[KEY_CODES.UP]) {
		curSpaceship = spaceshipForward;
	}
	
	//Draw resources and asteroids
	for (var i = 0; i < resources.length; i++) {
		var coords = getLocalCoords(resources[i].x, resources[i].y);
		ctx.drawImage(resourceImage, coords.x-16, coords.y-16, 32, 32);
	}
	for (var i = 0; i < asteroids.length; i++) {
		var coords = getLocalCoords(asteroids[i].x, asteroids[i].y);
		ctx.drawImage(asteroidImage, coords.x-16, coords.y-16, asteroids[i].width, asteroids[i].height);
	}

	for (var i = 0; i < players.length; i++) {
		if (p.id != players[i].id) {
			var coords = getLocalCoords(players[i].x, players[i].y);
			ctx.save();
			ctx.translate(coords.x,coords.y);
			ctx.rotate((players[i].angle+90)*TO_RADIANS);
			ctx.drawImage(spaceship[players[i].state], -32, -32, 64, 64);
			ctx.restore();
		}
	}
	
	//Draw spaceship
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate((p.angle+90)*TO_RADIANS);
	ctx.drawImage(curSpaceship, -32, -32, 64, 64);
    ctx.restore();

    var pingText = "Ping: " + p.ping;
    ctx.font = 'italic 40pt Calibri';
    ctx.fillText(pingText, 30, canvas.height-30);
}