function Player(id) {
  this.x = 0;
  this.y = 0;
  this.angle = 0;
  this.name = name;
  this.id = id;
  this.speed;
  this.lastMovedTime = 0;
  this.ping = 0;
  this.pingStart = 0;

  return {
    x: this.x,
    y: this.y,
    angle: this.angle,
    name: this.name,
    id: this.id,
    speed: this.speed,
    lastMovedTime: this.lastMovedTime,
    ping: this.ping,
    pingStart: this.pingStart
  }
}