function Resource(id,x,y,type) {
  this.id = id;
  this.x = Math.floor(x);
  this.y = Math.floor(y);
  this.type = type;
  this.health = 20;
  this.width = 32;
  this.height = 32;
  this.destroyed = false;

  return {
    id: this.id,
    x: this.x,
    y: this.y,
    type: this.type,
    health: this.health,
    width: this.width,
    height: this.height,
    destroyed: this.destroyed
  };
}
exports.Resource = Resource;