function Asteroid(id,x,y,angle,ind,imageNum) {
  this.id = id;
  this.ind = ind;
  this.x = x;
  this.y = y;
  this.health = 20;
  this.angle = angle;
  this.width = 64;
  this.height = 64;
  this.timeOfDeath = null;
  this.timeSinceDeath = null;
  this.lastMoveTime = Date.now();
  this.type = 'asteroid';
  this.imageNum = imageNum;
  
  return {
    id: this.id,
    ind: this.ind,
    x: this.x,
    y: this.y,
    health: this.health,
    angle: this.angle,
    width: this.width,
    height: this.height,
    timeOfDeath: this.timeOfDeath,
    timeSinceDeath: this.timeSinceDeath,
    lastMoveTime: this.lastMoveTime,
    type: this.type,
    imageNum: this.imageNum
  };
}
exports.Asteroid = Asteroid;