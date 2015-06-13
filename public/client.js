//Game objects
var players = [];
var asteroids = [];
var canvas = $("#game-canvas")[0];
var ctx = canvas.getContext("2d");
var spaceshipStationary = new Image();
var spaceshipLeft = new Image();
var spaceshipRight = new Image();
var spaceshipForward = new Image();
spaceshipStationary.src = 'images/FirstSpace_NoFlame.png';
spaceshipLeft.src = 'images/FirstSpace_RightFlame.png';
spaceshipRight.src = 'images/FirstSpace_LeftFlame.png';
spaceshipForward.src = 'images/FirstSpace.png';

$(function() {
	$("#game-canvas").css('height', $(window).height());
	$("#game-canvas").css('width', $(window).width());
	
	//registerSocketHooks();
	
	//Start timed canvas updates for UI
	setInterval(updateCanvas, 30);
});

function registerSocketHooks() {
	//socket.emit('name', object);
	//socket.on('name', function to handle object);
	
	//Join player to game
	var socket = io();
	
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
	//Draw spaceship based on movement
	ctx.drawImage(spaceshipStationary,canvas.width/2-32,canvas.height/2-32, 64, 64);
	//ctx.drawImage(spaceshipStationary,5,20, 64, 64);
	//Set rotation if applicable
	
}