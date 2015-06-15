function Asteroid(id,x,y,angle,imageNum) {
  this.id = id;
  this.x = Math.floor(x);
  this.y = Math.floor(y);
  this.health = 20;
  this.angle = angle;
  this.width = 64;
  this.height = 64;
  this.timeOfDeath = null;
  this.timeSinceDeath = null;
  this.destroyed = false;
  this.lastMoveTime = Date.now();
  this.type = 'a';
  this.imageNum = imageNum;
  
  return {
    id: this.id,
    x: this.x,
    y: this.y,
    health: this.health,
    angle: this.angle,
    width: this.width,
    height: this.height,
    timeOfDeath: this.timeOfDeath,
    timeSinceDeath: this.timeSinceDeath,
    destroyed: this.destroyed,
    lastMoveTime: this.lastMoveTime,
    type: this.type,
    imageNum: this.imageNum
  };
}
exports.Asteroid = Asteroid;