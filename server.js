"use strict"

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Player = require('./Player.js').Player;

app.get('/', function(req, res) {
  res.sendFile('client/index.html',{root:'.'});
});
app.get('/index.html', function(req, res) {
  res.sendFile('client/index.html',{root:'.'});
});
app.get('/client.js', function(req, res) {
  res.sendFile('client/client.js',{root:'.'});
});

var mapWidth = 6000;
var mapHeight = 6000;
var players = [];
var asteroids = [];
var resources = [];

io.on('connection', function(socket) {
  console.log('a user connected');
  var player = new Player(socket.id);
});
