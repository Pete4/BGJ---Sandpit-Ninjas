function Resource(id,x,y,type,ind) {
  this.id = id;
  this.ind = ind;
  this.x = x;
  this.y = y;
  this.type = type;
  this.health = 100;
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