class VisColorLegend {
  constructor(el) {
    this.el = el;
    this.init();
  }

  init() {
    this.setup();
  }

  setup() {
    this.width = 12;
    this.height = 12;
    this.size = 80;

    this.symbol = {
      circle: d3.symbol(d3.symbolCircle, this.size)(),
      square: d3.symbol(d3.symbolSquare, this.size)(),
    };
  }

  render() {
    d3.select(this.el)
      .classed("vis-color-legend", true)
      .selectAll(".legend-item")
      .data(this.data)
      .join((enter) =>
        enter
          .append("div")
          .attr("class", "legend-item")
          .call((div) =>
            div
              .append("svg")
              .attr("class", "legend-item__swatch")
              .attr("width", this.width)
              .attr("height", this.height)
              .attr("viewBox", [
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height,
              ])
              .append("path")
              .attr("fill", "currentColor")
          )
          .call((div) => div.append("div").attr("class", "legend-item__label"))
      )
      .call((div) =>
        div
          .select(".legend-item__swatch")
          .attr(
            "class",
            (d) => `legend-item__swatch ${VisUtils.toKebabCase(d.label)}`
          )
          .select("path")
          .attr("d", (d) => this.symbol[d.symbol])
      )
      .call((div) => div.select(".legend-item__label").text((d) => d.label));
  }

  updateData(data) {
    this.data = data;
    this.render();
  }
}
