class VisDiversByPosition {
  constructor(el) {
    this.el = el;
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.moved = this.moved.bind(this);
    this.outed = this.outed.bind(this);
    this.init();
  }

  async init() {
    const dataUrl =
      "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart1Divers-by-position.csv";

    try {
      [this.data] = await new VisDataLoader(this.el).get([dataUrl]);
      this.setup();
      this.scaffold();
      this.wrangle();
      this.resize();
      VisUtils.observe(this.svg.node(), this.animate);
      window.addEventListener("resize", this.resize);
    } catch (error) {
      console.error(error);
    }
  }

  setup() {
    this.idx = null;

    this.accessor = {
      name: (d) => d.Name,
      position: (d) => d.Position,
      diveCount: (d) => +d[d.Position],
    };

    this.yTitle = "Number of dives";

    this.marginTop = 8;
    this.marginRight = 8;
    this.marginBottom = 8;
    this.marginLeft = 48;
    this.size = 80;
    this.focusRectWidth = 12;

    this.x = d3.scalePoint().padding(0.5);
    this.y = d3.scaleLinear();

    this.symbol = {
      circle: d3.symbol(d3.symbolCircle, this.size)(),
    };
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .classed("vis", true)
      .append("div")
      .attr("class", "vis-container vis-divers-by-position");

    this.chartContainer = this.container
      .append("div")
      .attr("class", "svg-container");

    this.svg = this.chartContainer.append("svg").attr("class", "chart-svg");
    this.focusRect = this.svg
      .append("rect")
      .attr("class", "focus-rect")
      .attr("y", this.marginTop)
      .attr("fill", "currentColor")
      .attr("display", "none");
    this.gY = this.svg.append("g").attr("class", "axis-g axis-g--y");
    this.gDots = this.svg.append("g").attr("class", "dots-g");
    this.captureRect = this.svg
      .append("rect")
      .attr("class", "capture-rect")
      .attr("fill", "none")
      .attr("pointer-events", "none")
      .on("pointerover", this.moved)
      .on("pointermove", this.moved)
      .on("pointerout", this.outed);

    this.legendContainer = this.container
      .append("div")
      .attr("class", "legend-container");
    this.legend = new VisColorLegend(this.legendContainer.node());

    this.tooltip = new VisTooltip(this.chartContainer.node());
  }

  wrangle() {
    this.displayData = this.data.map((d) => ({
      name: this.accessor.name(d),
      position: this.accessor.position(d),
      diveCount: this.accessor.diveCount(d),
      symbol: "circle",
    }));

    d3.group(this.displayData, (d) => d.position).forEach((group) => {
      group.forEach((d, i) => {
        d.idxDelay = i;
      });
    });

    this.legendData = this.data.columns.slice(2).map((label) => ({
      label,
      symbol: "circle",
    }));

    this.legend.updateData(this.legendData);

    this.x.domain(this.displayData.map((d) => d.name));
    this.y
      .domain([0, d3.max(this.displayData, (d) => d.diveCount) * 1.05])
      .nice();
  }

  resize() {
    const bcr = this.chartContainer.node().getBoundingClientRect();
    this.width = bcr.width;
    this.height = bcr.height;
    this.boundedWidth = this.width - this.marginLeft - this.marginRight;
    this.boundedHeight = this.height - this.marginTop - this.marginBottom;

    this.x.range([this.marginLeft, this.width - this.marginRight]);
    this.y.range([this.height - this.marginBottom, this.marginTop]);

    this.xs = this.x.domain().map(this.x);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);
    this.focusRect
      .attr("x", -this.focusRectWidth / 2)
      .attr("width", this.focusRectWidth)
      .attr("height", this.boundedHeight);
    this.captureRect.attr("width", this.width).attr("height", this.height);

    this.render();
  }

  render() {
    this.renderYAxis();
    if (this.initialized) {
      this.renderDots();
    }
  }

  renderYAxis() {
    this.gY
      .attr("transform", `translate(${this.marginLeft},0)`)
      .call(
        d3
          .axisLeft(this.y)
          .tickValues(
            d3.range(Math.ceil(this.y.domain()[1] / 5) + 1).map((i) => i * 5)
          )
          .tickSize(-this.boundedWidth)
          .tickPadding(8)
      )
      .call((g) => g.selectAll(".tick").classed("is-zero", (d) => d === 0))
      .call((g) =>
        g
          .selectAll(".axis-title")
          .data([this.yTitle])
          .join((enter) =>
            enter
              .append("text")
              .attr("class", "axis-title")
              .attr("fill", "currentColor")
              .attr("text-anchor", "middle")
              .attr("dy", "0.71em")
              .text((d) => d)
          )
          .attr(
            "transform",
            `rotate(-90)translate(${-this.marginTop - this.boundedHeight / 2},${
              -this.marginLeft + 4
            })`
          )
      );
  }

  renderDots() {
    this.dot.attr(
      "transform",
      (d) => `translate(${this.x(d.name)},${this.y(d.diveCount)})`
    );
  }

  renderFocus() {
    if (this.idx === null) {
      this.focusRect.attr("display", "none");
      this.dot.classed("is-highlighted", false);
    } else {
      this.focusRect
        .attr("display", null)
        .attr("transform", `translate(${this.x(this.x.domain()[this.idx])},0)`);
      this.dot
        .classed("is-highlighted", (d, i) => i === this.idx)
        .filter((d, i) => i === this.idx)
        .raise();
    }
  }

  async animate() {
    this.captureRect.attr("pointer-events", "none");

    this.dot = this.gDots
      .selectAll(".symbol-path")
      .data(this.displayData, (d) => d.name)
      .join((enter) =>
        enter
          .append("path")
          .attr(
            "class",
            (d) => `symbol-path ${VisUtils.toKebabCase(d.position)}`
          )
          .attr("fill", "currentColor")
          .attr("fill-opacity", 0)
          .attr("d", (d) => this.symbol[d.symbol])
          .attr("transform", (d) => `translate(${this.x(d.name)},${this.y(0)})`)
      );

    await this.dot
      .transition()
      .duration(250)
      .delay((d) => d.idxDelay * 10)
      .attr("fill-opacity", 1)
      .attr(
        "transform",
        (d) => `translate(${this.x(d.name)},${this.y(d.diveCount)})`
      )
      .end();

    this.captureRect.attr("pointer-events", "all");

    this.initialized = true;
  }

  moved(event) {
    event.preventDefault();
    const [xp, yp] = d3.pointer(event);
    const idx = d3.bisectCenter(this.xs, xp);
    if (idx !== this.idx) {
      this.idx = idx;
      this.renderFocus();
      this.tooltip.show(this.tooltipContent());
    }
    this.tooltip.move(this.xs[this.idx], yp);
  }

  outed(event) {
    event.preventDefault();
    this.idx = null;
    this.renderFocus();
    this.tooltip.hide();
  }

  tooltipContent() {
    const d = this.displayData[this.idx];
    return `
      <div>
        <span class="tooltip-highlight">${d.name}</span>
      </div>
      <div>
        ${d.position}
      </div>
      <div>
        <span class="tooltip-highlight">${
          d.diveCount
        }</span> ${VisUtils.pluralize(d.diveCount, "Dives")}
      </div>
    `;
  }
}
