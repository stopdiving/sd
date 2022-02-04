class VisToggle {
  constructor(el, options) {
    this.el = el;
    this.options = options;
    this.init();
  }

  init() {
    this.id = VisUtils.id();

    d3.select(this.el)
      .attr("class", "vis-toggle")
      .selectAll(".toggle-item")
      .data(this.options)
      .join((enter) =>
        enter
          .append("div")
          .attr("class", "toggle-item")
          .call((div) =>
            div
              .append("input")
              .attr("class", "toggle-item__input")
              .attr("type", "radio")
              .attr("name", this.id)
              .attr("id", (d, i) => `${this.id}-${i}`)
              .attr("value", (d) => d.value)
              .attr("checked", (d) => (d.selected ? "checked" : null))
          )
          .call((div) =>
            div
              .append("label")
              .attr("class", "toggle-item__label")
              .attr("for", (d, i) => `${this.id}-${i}`)
              .text((d) => d.label)
          )
      );
  }
}
