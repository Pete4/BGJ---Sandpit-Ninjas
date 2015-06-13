function Player(id,name) {
  this.id = id;
  this.x = 3000;
  this.y = 3000;
  this.angle = 270;
  this.name = name;
  this.canvasSize = {width:1980,height:1024};
  this.forwardSpeed = 100; // px/sec
  this.rotationSpeed = 160; // deg/sec
  this.lastMovedTime = Date.now();
  this.ping = 0;
  this.pingStart = 0;
  this.keyState = {};
  this.state = 0;

  return {
    id: this.id,
    x: this.x,
    y: this.y,
    angle: this.angle,
    name: this.name,
    canvasSize: this.canvasSize,
    forwardSpeed: this.forwardSpeed,
    rotationSpeed: this.rotationSpeed,
    lastMovedTime: this.lastMovedTime,
    ping: this.ping,
    pingStart: this.pingStart,
    keyState: this.keyState,
    state: this.state
  }
}
exports.Player = Player;