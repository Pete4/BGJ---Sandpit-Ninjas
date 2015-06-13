//Game objects
var players = [];
var asteroids = [];
var canvas = $("#game-canvas")[0];
var ctx = canvas.getContext("2d");
var keyState = {};
var curRotation = 0;
var socket;

var spaceshipStationary = new Image();
var spaceshipLeft = new Image();
var spaceshipRight = new Image();
var spaceshipForward = new Image();
spaceshipStationary.src = 'images/FirstSpace_NoFlame.png';
spaceshipLeft.src = 'images/FirstSpace_RightFlame.png';
spaceshipRight.src = 'images/FirstSpace_LeftFlame.png';
spaceshipForward.src = 'images/FirstSpace.png';

//var audio = new Audio('audio_file.mp3');
//audio.play();

//Utilities
var usedKeys = [37, 38, 39, 40];
KEY_CODES = {
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
	setInterval(updateCanvas, 25);
	
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
	socket.on('players', function(p) {
		players = p;
	})
	socket.on('gamedata', function(obj) {
		players = obj.players;
		asteroids = obj.asteroids;
	})
}

function updateCanvas() {
	var curSpaceship = spaceshipStationary;
	
	//Clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	//Work out rotation
	if (keyState[KEY_CODES.LEFT]) {
		curSpaceship = spaceshipLeft;
		if (curRotation == 0) {
			curRotation = 356;
		} else {
			curRotation = curRotation - 4;
		}
	} else if (keyState[KEY_CODES.RIGHT]) {
		curSpaceship = spaceshipRight;
		if (curRotation == 359) {
			curRotation = 3;
		} else {
			curRotation = curRotation + 4;
		}
	} else if (keyState[KEY_CODES.UP]) {
		curSpaceship = spaceshipForward;
	}
	
	//Draw spaceship
    ctx.save();
    ctx.translate(canvas.width/2,canvas.height/2);
    ctx.rotate(curRotation*TO_RADIANS);
	ctx.drawImage(curSpaceship, -32, -32);
    ctx.restore();
}