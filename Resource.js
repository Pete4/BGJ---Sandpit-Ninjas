function Resource(id,x,y,type) {
  this.id = id;
  this.ind = null;
  this.x = x;
  this.y = y;
  this.type = type;
  this.health = 20;
  this.width = 32;
  this.height = 32;

  return {
    id: this.id,
    ind: this.ind,
    x: this.x,
    y: this.y,
    type: this.type,
    health: this.health,
    width: this.width,
    height: this.height
  };
}
exports.Resource = Resource;