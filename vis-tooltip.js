class VisTooltip {
  constructor(el) {
    this.el = el;
    this.show = this.show.bind(this);
    this.move = this.move.bind(this);
    this.hide = this.hide.bind(this);
    this.init();
  }

  init() {
    this.tooltip = d3
      .select(this.el)
      .append("div")
      .attr("class", "vis-tooltip");

    this.xOffset = 16;
    this.yOffset = 24;
  }

  show(content) {
    this.tooltip.html(content).classed("is-visible", true);

    this.bbox = this.el.getBoundingClientRect();
    this.tbox = this.tooltip.node().getBoundingClientRect();
  }

  hide() {
    this.tooltip.classed("is-visible", false);
  }

  move(x0, y0) {
    let x = x0 - this.tbox.width - this.xOffset;
    if (x < 0) x = x0 + this.xOffset;
    if (x + this.tbox.width > this.bbox.width)
      x = this.bbox.width - this.tbox.width;

    let y = y0 - this.tbox.height - this.yOffset;

    this.tooltip.style("transform", `translate(${x}px,${y}px)`);
  }
}
