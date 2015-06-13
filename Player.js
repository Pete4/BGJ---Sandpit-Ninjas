function Player(id,name) {
  this.id = id;
  this.x = 0;
  this.y = 0;
  this.angle = 0;
  this.name = name;
  this.forwardSpeed = 20; // px/sec
  this.rotationSpeed = 160; // deg/sec
  this.lastMovedTime = 0;
  this.ping = 0;
  this.pingStart = 0;
  this.keyState = {};

  return {
    id: this.id,
    x: this.x,
    y: this.y,
    angle: this.angle,
    name: this.name,
    speed: this.speed,
    lastMovedTime: this.lastMovedTime,
    ping: this.ping,
    pingStart: this.pingStart,
    keyState: this.keyState
  }
}
exports.Player = Player;