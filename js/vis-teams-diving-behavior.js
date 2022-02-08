class VisTeamsDivingBehavior {
  constructor(el) {
    this.el = el;
    this.resize = this.resize.bind(this);
    this.animate = this.animate.bind(this);
    this.moved = this.moved.bind(this);
    this.outed = this.outed.bind(this);
    this.init();
  }

  async init() {
    const mensDataUrl =
      "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart2Teams-diving-behavior-(Mens).csv";
    const womensDataUrl =
      "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart2Teams-diving-behavior(Womens).csv";

    try {
      const [men, women] = await new VisDataLoader(this.el).get([
        mensDataUrl,
        womensDataUrl,
      ]);
      this.data = { men, women };
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
    this.selected = "men";

    this.accessor = {
      name: (d) => d.Team,
      diveCount: (d) => +d["Total Dives"],
      divesPerMatch: (d) => +d["Dives/Match"],
    };

    this.yTitle = "Number of dives";

    this.marginTop = 8;
    this.marginRight = 8;
    this.marginBottom = 100;
    this.marginLeftNarrow = 8;
    this.marginLeftWide = 48;
    this.breakpoint = 400;
    this.size = 80;
    this.focusRectWidth = 12;

    this.x = d3.scalePoint().padding(0.5);
    this.y = d3.scaleLinear();

    this.symbol = {
      circle: d3.symbol(d3.symbolCircle, this.size)(),
      square: d3.symbol(d3.symbolSquare, this.size)(),
    };
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .classed("vis", true)
      .append("div")
      .attr("class", "vis-container vis-teams-diving-behavior");

    this.toggleContainer = this.container
      .append("div")
      .attr("class", "toggle-container");

    new VisToggle(this.toggleContainer.node(), [
      { value: "men", label: "Men's", selected: true },
      { value: "women", label: "Women's" },
    ]);

    this.toggleContainer.on("change", (event) => {
      this.selected = event.target.value;
      this.idx = null;
      this.wrangle();
      this.animate();
    });

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
    this.gX = this.svg.append("g").attr("class", "axis-g axis-g--x");
    this.gSymbols = this.svg.append("g").attr("class", "symbols-g");
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
    this.displayData = this.data[this.selected]
      .map((d) => ({
        name: this.accessor.name(d),
        values: [
          {
            label: "Dives/Match",
            value: this.accessor.divesPerMatch(d),
            symbol: "square",
          },
          {
            label: "Dives",
            value: this.accessor.diveCount(d),
            symbol: "circle",
          },
        ],
      }))
      .sort((a, b) => d3.descending(a.values[0].value, b.values[0].value));
    this.displayData.forEach((d, i) => {
      d.values.forEach((e) => (e.idxDelay = i));
    });

    if (!this.legendData) {
      this.legendData = [
        {
          label: "Dives/Match",
          symbol: "square",
        },
        {
          label: "Dives",
          symbol: "circle",
        },
      ];

      this.legend.updateData(this.legendData);
    }

    this.x.domain(this.displayData.map((d) => d.name));

    this.xs = this.x.domain().map(this.x);

    if (!this.maxDiveCount) {
      this.maxDiveCount = {
        men: d3.max(this.data.men, this.accessor.diveCount),
        women: d3.max(this.data.women, this.accessor.diveCount),
      };
    }
    this.y.domain([0, this.maxDiveCount[this.selected]]).nice();

    this.container
      .classed("is-men", this.selected === "men")
      .classed("is-women", this.selected === "women");
  }

  resize() {
    const bcr = this.chartContainer.node().getBoundingClientRect();
    this.width = bcr.width;
    this.height = bcr.height;

    this.showYAxis = this.width >= this.breakpoint;
    this.marginLeft = this.showYAxis
      ? this.marginLeftWide
      : this.marginLeftNarrow;

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
    this.renderXAxis();
    if (this.initialized) {
      this.renderSymbols();
    }
  }

  renderYAxis() {
    this.gY
      .attr("transform", `translate(${this.marginLeft},0)`)
      .call(
        d3
          .axisLeft(this.y)
          .ticks(this.boundedHeight / 50)
          .tickSize(-this.boundedWidth)
          .tickPadding(8)
      )
      .call((g) => g.selectAll(".tick").classed("is-zero", (d) => d === 0))
      .call((g) =>
        g
          .selectAll(".tick text")
          .style("display", this.showYAxis ? null : "none")
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
          .style("display", this.showYAxis ? null : "none")
      );
  }

  renderXAxis() {
    this.gX
      .attr("transform", `translate(0,${this.height - this.marginBottom})`)
      .selectAll(".tick")
      .attr("transform", (d) => `translate(${this.x(d)},12)`);
  }

  renderSymbols() {
    this.gSymbols
      .selectAll(".group-g")
      .attr("transform", (d) => `translate(${this.x(d.name)},0)`)
      .selectAll(".symbol-path")
      .attr("transform", (d) => `translate(0,${this.y(d.value)})`);
  }

  renderFocus() {
    if (this.idx === null) {
      this.focusRect.attr("display", "none");
      this.group.classed("is-highlighted", false);
    } else {
      this.focusRect
        .attr("display", null)
        .attr("transform", `translate(${this.x(this.x.domain()[this.idx])},0)`);
      this.group
        .classed("is-highlighted", (d, i) => i === this.idx)
        .filter((d, i) => i === this.idx)
        .raise();
    }
  }

  async animate() {
    this.captureRect.attr("pointer-events", "none");

    this.group = this.gSymbols
      .selectAll(".group-g")
      .data(this.displayData, (d) => d.name)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "group-g")
          .attr("fill-opacity", 0)
          .attr("transform", (d) => `translate(${this.x(d.name)},0)`)
      );

    this.symbolPath = this.group
      .selectAll(".symbol-path")
      .data((d) => d.values)
      .join((enter) =>
        enter
          .append("path")
          .attr("class", (d) => `symbol-path ${VisUtils.toKebabCase(d.label)}`)
          .attr("fill", "currentColor")
          .attr("d", (d) => this.symbol[d.symbol])
          .attr("transform", (d) => `translate(0,${this.y(0)})`)
      );

    this.xTick = this.gX
      .attr("transform", `translate(0,${this.height - this.marginBottom})`)
      .selectAll(".tick")
      .data(this.x.domain(), (d) => d)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "tick")
          .attr("transform", (d) => `translate(${this.x(d)},12)`)
          .call((g) =>
            g
              .append("text")
              .attr("fill", "currentColor")
              .attr("text-anchor", "end")
              .attr("dy", "0.32em")
              .attr("transform", "rotate(-90)")
              .text((d) => d)
          )
      );

    this.xTick
      .transition()
      .duration(500)
      .attr("transform", (d) => `translate(${this.x(d)},12)`);

    await this.group
      .transition()
      .duration(500)
      .attr("fill-opacity", 1)
      .attr("transform", (d) => `translate(${this.x(d.name)},0)`)
      .end();

    this.gY.transition().call(
      d3
        .axisLeft(this.y)
        .ticks(this.boundedHeight / 50)
        .tickSize(-this.boundedWidth)
        .tickPadding(8)
    );
    this.gY
      .call((g) => g.selectAll(".tick").classed("is-zero", (d) => d === 0))
      .call((g) =>
        g
          .selectAll(".tick text")
          .style("display", this.showYAxis ? null : "none")
      );

    await this.symbolPath
      .transition()
      .duration(250)
      .delay((d) => d.idxDelay * 25)
      .attr("transform", (d) => `translate(0,${this.y(d.value)})`)
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
      ${d.values
        .map(
          (e) =>
            `<div>
            <span class="tooltip-highlight">${e.value}</span> 
            ${VisUtils.pluralize(e.value, e.label)}
          </div>`
        )
        .reverse()
        .join("")}
    `;
  }
}
