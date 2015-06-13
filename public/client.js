"use strict"
//Game objects
var player = {angle:270, fuel:100, junk:0};
var players = []; // other players
var asteroids = [];
var resources = [];
var canvas = $("#game-canvas")[0];
var canvasSize = {height:0, width:0}
var ctx = canvas.getContext("2d");
var keyState = {};
var socket;
var frameDelay = 25;
var lastMovedTime = Date.now();

// Load images
var spaceshipStationary = new Image();
var spaceshipLeft = new Image();
var spaceshipRight = new Image();
var spaceshipForward = new Image();
var asteroidImage = new Image;
var resourceImage = new Image;
var fuelImage = new Image;
var junkImage = new Image;
var blueBarImage = new Image;
var pinkBarImage = new Image;
spaceshipStationary.src = 'images/FirstSpace_NoFlame.png';
spaceshipLeft.src = 'images/FirstSpace_RightFlame.png';
spaceshipRight.src = 'images/FirstSpace_LeftFlame.png';
spaceshipForward.src = 'images/FirstSpace.png';
var spaceship = [spaceshipStationary,spaceshipLeft,spaceshipRight,spaceshipForward]; // useful format
asteroidImage.src = 'images/Asteroid.png';
resourceImage.src = 'images/Resource.png';
fuelImage.src = 'images/FuelIcon.png';
junkImage.src = 'images/JunkIcon.png';
blueBarImage.src = 'images/BlueBar.png';
pinkBarImage.src = 'images/PinkBar.png';

//Load sound effects
var audioEngineStart = new Audio('sound/engine_start.mp3');
var audioEngineStop = new Audio('sound/engine_stop.mp3');
var audioEngineOn = new Audio('sound/engine_on.mp3');

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
	registerSocketHooks();
	updateCanvasSize();
	
	//Start timed canvas updates for UI
	setInterval(updateCanvas, frameDelay);
	
	window.addEventListener('keydown',function(e){
		if (usedKeys.indexOf(e.which) != -1 && !keyState[e.which]) {
			keyState[e.which] = true;
			socket.emit('keyupdate', keyState);
			lastMovedTime = Date.now();
		}
    },true);
    window.addEventListener('keyup',function(e){
		if (usedKeys.indexOf(e.which) != -1 && keyState[e.which]) {
			keyState[e.which] = false;
			socket.emit('keyupdate', keyState);
			lastMovedTime = Date.now();
		}
    },true);
    window.addEventListener("resize", function(){
		updateCanvasSize();
    },true);
	window.addEventListener("blur", function(){
		keyState = {}
	});
});

function updateCanvasSize() {
	canvas.height = $(window).height();
	canvas.width = $(window).width();
	canvasSize.height = canvas.height;
	canvasSize.width = canvas.width;
	
	socket.emit('canvassize',canvasSize);
}

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

function movePlayer(p) {
	var p = player;
	var delta = (Date.now()-lastMovedTime)/1000.0;
    if (p.keyState[KEY_CODES.LEFT]) {
		playSoundEffect(p);
		p.state = 1;
		p.angle = (p.angle - p.rotationSpeed*delta) % 360;
		if (p.angle < 0) p.angle += 360;
    } else if (p.keyState[KEY_CODES.RIGHT]) {
		playSoundEffect(p);
		p.state = 2;
		p.angle = (p.angle + p.rotationSpeed*delta) % 360;
		if (p.angle < 0) p.angle += 360;
    } else if (p.keyState[KEY_CODES.UP]) {
		//console.log(p.state);
		playSoundEffect(p);
		p.state = 3;
		p.x += p.forwardSpeed*delta*Math.cos(TO_RADIANS*p.angle);
		p.y += p.forwardSpeed*delta*Math.sin(TO_RADIANS*p.angle);
    } else {
		stopSoundEffects();
		p.state = 0;
	}
    lastMovedTime = Date.now();
}

function playSoundEffect(p) {
	if (p.state == 0) {
		if (audioEngineOn.paused) {
			audioEngineStart.play();
		}
	} else {
		if (audioEngineStart.paused) {
			audioEngineOn.play();
		}
	}
}

function stopSoundEffects() {
	audioEngineStart.pause();
	audioEngineOn.pause();
}

function drawResourcesAndAsteroids() {
	//Draw resources and asteroids
	for (var i = 0; i < resources.length; i++) {
		var coords = getLocalCoords(resources[i].x, resources[i].y);
		ctx.drawImage(resourceImage, coords.x-16, coords.y-16, 32, 32);
	}
	for (var i = 0; i < asteroids.length; i++) {
		var coords = getLocalCoords(asteroids[i].x, asteroids[i].y);
		ctx.drawImage(asteroidImage, coords.x-16, coords.y-16, 64, 64);
	}
}

function drawPlayers() {
	//Draw others spaceships
	for (var i = 0; i < players.length; i++) {
		if (player.id != players[i].id) {
			var coords = getLocalCoords(players[i].x, players[i].y);
			ctx.save();
			ctx.translate(coords.x,coords.y);
			ctx.rotate((players[i].angle+90)*TO_RADIANS);
			ctx.drawImage(spaceship[players[i].state], -32, -32, 64, 64);
			ctx.restore();
		}
	}
	
	//Draw our spaceship
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate((player.angle+90)*TO_RADIANS);
	ctx.drawImage(spaceship[player.state], -32, -32, 64, 64);
    ctx.restore();
}

function updateCanvas() {
	//Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	movePlayer();
	drawResourcesAndAsteroids();
	drawPlayers();
	drawUI();
}

function drawUI() {
	//Display ping
    var pingText = "Ping: " + player.ping;
    ctx.font = 'italic 40pt Calibri';
	ctx.fillStyle="#2ecc71";
    ctx.fillText(pingText, 30, 60);
	
	//Display fuel
	var fuelHeightOffset = 90;
	var fuelBars = Math.floor(player.fuel/20);
	var fuelExcess = player.fuel % 20;
	ctx.drawImage(fuelImage, 20, canvas.height-fuelHeightOffset);
	for (var i = 1; i <= fuelBars; i++) {
		if (i % 2 == 0) {
			ctx.drawImage(blueBarImage, 75 + (i*20), canvas.height-fuelHeightOffset);
		} else {
			ctx.drawImage(pinkBarImage, 75 + (i*20), canvas.height-fuelHeightOffset);
		}
	}
	if (fuelExcess != 0) {
		if (fuelBars % 2 == 0) {
			ctx.drawImage(blueBarImage, 0, 0, 16*(fuelExcess/20), 32, 75 + ((fuelBars+1)*20), canvas.height-fuelHeightOffset, 16*(fuelExcess/20), 32);
		} else {
			ctx.drawImage(pinkBarImage, 0, 0, 16*(fuelExcess/20), 32, 75 + ((fuelBars+1)*20), canvas.height-fuelHeightOffset, 16*(fuelExcess/20), 32);
		}
	}
	
	//Display cargo
	var junkHeightOffset = 50;
	ctx.drawImage(junkImage, 20, canvas.height-junkHeightOffset);
	for (var i = 1; i <= player.junk; i++) {
		if (i % 2 == 0) {
			ctx.drawImage(blueBarImage, 75 + (i*20), canvas.height-junkHeightOffset);
		} else {
			ctx.drawImage(pinkBarImage, 75 + (i*20), canvas.height-junkHeightOffset);
		}
	}
}