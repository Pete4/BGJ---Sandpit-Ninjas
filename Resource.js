function Resource(id,x,y,type) {
  this.id = id;
  this.x = x;
  this.y = y;
  this.type = type;

  return {
    id: this.id,
    x: this.x,
    y: this.y,
    type: this.type
  }
}
exports.Resource = Resource;