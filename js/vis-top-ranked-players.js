class VisTopRankedPlayers {
  constructor(el, category) {
    this.el = el;
    this.category = category;
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.moved = this.moved.bind(this);
    this.outed = this.outed.bind(this);
    this.init();
  }

  async init() {
    const dataUrl = {
      men: [
        "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart3Top-ranked-players(Mens).csv",
        "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart3Top-ranked-players(MensTrendline).csv",
      ],
      women: [
        "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart4Top-ranked-players(Womens).csv",
        "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart4Top-ranked-players(WomensTrendline).csv",
      ],
    };

    try {
      [this.data, this.trendCoefficients] = await new VisDataLoader(
        this.el
      ).get(dataUrl[this.category]);
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
      divesPerHour: (d) => +d["Dives/hr"],
      ranking: (d) => +d.Ranking,
      colorHighlight: (d) => !!d["Color Highlight"],
      labelHighlight: (d) => !!d["Label Highlight"],
    };

    this.yTitle = "Divers per hour";
    this.xTitle = "Ranking";

    this.marginTop = 24;
    this.marginRight = 8;
    this.marginBottom = 32;
    this.marginLeft = 32;
    this.size = 80;
    this.focusCircleRadius = 12;

    this.x = d3.scaleLinear();
    this.y = d3.scaleLinear();

    this.linePath = d3
      .line()
      .x((d) => this.x(d[0]))
      .y((d) => this.y(d[1]));

    this.symbol = {
      circle: d3.symbol(d3.symbolCircle, this.size)(),
    };
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .classed("vis", true)
      .append("div")
      .attr(
        "class",
        `vis-container vis-top-ranked-players is-${this.category}`
      );

    this.chartContainer = this.container
      .append("div")
      .attr("class", "svg-container");

    this.svg = this.chartContainer.append("svg").attr("class", "chart-svg");
    this.focusCircle = this.svg
      .append("circle")
      .attr("class", "focus-circle")
      .attr("r", this.focusCircleRadius)
      .attr("fill", "currentColor")
      .attr("display", "none");
    this.gY = this.svg.append("g").attr("class", "axis-g axis-g--y");
    this.gX = this.svg.append("g").attr("class", "axis-g axis-g--x");
    this.trendLine = this.svg
      .append("path")
      .attr("class", "trend-path")
      .attr("fill", "none")
      .attr("stroke", "currentColor")
      .attr("stroke-width", 1.5)
      .attr("pathLength", 1);
    this.gDots = this.svg.append("g").attr("class", "dots-g");
    this.gLabels = this.svg.append("g").attr("class", "labels-g");
    this.captureRect = this.svg
      .append("rect")
      .attr("class", "capture-rect")
      .attr("fill", "none")
      .attr("pointer-events", "none")
      .on("pointerover", this.moved)
      .on("pointermove", this.moved)
      .on("pointerout", this.outed);

    this.tooltip = new VisTooltip(this.chartContainer.node());
  }

  wrangle() {
    this.displayData = this.data
      .map((d) => ({
        name: this.accessor.name(d),
        divesPerHour: this.accessor.divesPerHour(d),
        ranking: this.accessor.ranking(d),
        colorHighlight: this.accessor.colorHighlight(d),
        labelHighlight: this.accessor.labelHighlight(d),
        symbol: "circle",
      }))
      .filter((d) => d.name)
      .reverse();

    if (this.category === "men") {
      const a = +this.trendCoefficients[0].a;
      const b = +this.trendCoefficients[0].b;
      this.regressionFunction = (d) => a * Math.pow(b, d);
    } else if (this.category === "women") {
      const a = +this.trendCoefficients[0].a;
      const b = +this.trendCoefficients[0].b;
      const c = +this.trendCoefficients[0].c;
      this.regressionFunction = (d) => a * d * d + b * d + c;
    }

    const rankingExtent = d3.extent(this.displayData, (d) => d.ranking);
    this.trendLineData = d3
      .range(rankingExtent[0], rankingExtent[1] + 0.1, 0.1)
      .map((d) => [d, this.regressionFunction(d)]);

    this.x.domain(rankingExtent);
    this.y
      .domain([0, d3.max(this.displayData, (d) => d.divesPerHour) * 1.05])
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

    this.delaunay = d3.Delaunay.from(
      this.displayData,
      (d) => this.x(d.ranking),
      (d) => this.y(d.divesPerHour)
    );

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);
    this.captureRect.attr("width", this.width).attr("height", this.height);

    this.render();
  }

  render() {
    this.renderYAxis();
    this.renderXAxis();
    if (this.initialized) {
      this.renderDots();
      this.renderLabels();
      this.renderTrendLine();
    }
  }

  renderYAxis() {
    this.gY
      .attr("transform", `translate(${this.marginLeft},0)`)
      .call((g) =>
        g
          .selectAll(".tick")
          .data([0])
          .join((enter) =>
            enter
              .append("g")
              .attr("class", "tick is-zero")
              .call((g) => g.append("line").attr("stroke", "currentColor"))
          )
          .attr("transform", `translate(0,${this.y(0)})`)
          .select("line")
          .attr("x2", this.boundedWidth)
      )
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

  renderXAxis() {
    this.gX
      .attr("transform", `translate(0,${this.height - this.marginBottom})`)
      .call((g) =>
        g
          .selectAll(".axis-title")
          .data([this.xTitle])
          .join((enter) =>
            enter
              .append("text")
              .attr("class", "axis-title")
              .attr("fill", "currentColor")
              .attr("text-anchor", "middle")
              .text((d) => d)
          )
          .attr(
            "transform",
            `translate(${this.marginLeft + this.boundedWidth / 2},${
              this.marginBottom - 8
            })`
          )
      );
  }

  renderDots() {
    this.dot.attr(
      "transform",
      (d) => `translate(${this.x(d.ranking)},${this.y(d.divesPerHour)})`
    );
  }

  renderLabels() {
    this.label.attr(
      "transform",
      (d) => `translate(${this.x(d.ranking)},${this.y(d.divesPerHour)})`
    );
  }

  renderTrendLine() {
    this.trendLine.attr("d", this.linePath(this.trendLineData));
  }

  renderFocus() {
    if (this.idx === null) {
      this.focusCircle.attr("display", "none");
      this.dot.classed("is-highlighted", false);
    } else {
      this.focusCircle
        .attr("display", null)
        .attr(
          "transform",
          `translate(${this.x(this.displayData[this.idx].ranking)},${this.y(
            this.displayData[this.idx].divesPerHour
          )})`
        );
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
            (d) =>
              `symbol-path ${d.labelHighlight ? "is-label-highlighted" : ""} ${
                d.colorHighlight ? "is-color-highlighted" : ""
              }`
          )
          .attr("fill", "currentColor")
          .attr("fill-opacity", 0)
          .attr(
            "transform",
            (d) => `translate(${this.x(d.ranking)},${this.y(0)})`
          )
          .attr("d", (d) => this.symbol[d.symbol])
      );

    this.label = this.gLabels
      .selectAll(".label-g")
      .data(
        this.displayData.filter((d) => d.labelHighlight),
        (d) => d.name
      )
      .join((enter) =>
        enter
          .append("g")
          .attr("opacity", 0)
          .attr(
            "class",
            (d) =>
              `label-g is-label-highlighted ${
                d.colorHighlight ? "is-color-highlighted" : ""
              }`
          )
          .attr(
            "transform",
            (d) => `translate(${this.x(d.ranking)},${this.y(d.divesPerHour)})`
          )
          .call((g) =>
            g
              .selectAll("text")
              .data(["bg", "fg"])
              .join("text")
              .attr("class", (d) => `label-text label-text__${d}`)
              .attr("y", -8)
              .attr("text-anchor", "middle")
              .attr("fill", "currentColor")
              .text(function () {
                return d3.select(this.parentNode).datum().name;
              })
          )
      );

    this.trendLine
      .attr("d", this.linePath(this.trendLineData))
      .attr("stroke-dasharray", 1)
      .attr("stroke-dashoffset", 1);

    await this.dot
      .transition()
      .duration(250)
      .delay((d, i) => i * 25)
      .attr("fill-opacity", 1)
      .attr(
        "transform",
        (d) => `translate(${this.x(d.ranking)},${this.y(d.divesPerHour)})`
      )
      .end();

    await this.label.transition().duration(250).attr("opacity", 1);

    await this.trendLine
      .transition()
      .duration(500)
      .attr("stroke-dashoffset", 0);

    this.captureRect.attr("pointer-events", "all");

    this.initialized = true;
  }

  moved(event) {
    event.preventDefault();
    const idx = this.delaunay.find(...d3.pointer(event));
    if (idx !== this.idx) {
      this.idx = idx;
      this.renderFocus();
      this.tooltip.show(this.tooltipContent());
    }
    this.tooltip.move(
      this.x(this.displayData[this.idx].ranking),
      this.y(this.displayData[this.idx].divesPerHour)
    );
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
        <span class="tooltip-highlight">${
          d.divesPerHour
        }</span> ${VisUtils.pluralize(d.divesPerHour, "Dives/Hour")}
      </div>
    `;
  }
}
