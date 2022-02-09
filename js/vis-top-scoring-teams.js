class VisTopScoringTeams {
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
      men: "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart5Top-scoring-teams(Mens).csv",
      women:
        "https://cdn.jsdelivr.net/gh/stopdiving/sd/CVS/SoccerDivingData(public-charts-data-source)Chart6-Top-scoring-teams(Womens).csv",
    };

    try {
      [this.data] = await new VisDataLoader(this.el).get([
        dataUrl[this.category],
      ]);
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
      name: (d) => d.Team,
      goalCount: (d) => +d["Scored Goals"],
      diveCount: (d) => +d["Dives"],
      goalDiveRatio: (d) => +d["Goals/Dives"],
    };

    this.marginTop = 16;
    this.marginRight = 8;
    this.marginBottom = 40;
    this.marginLeft = 96;
    this.xTickOffset = 16;

    this.x = d3.scaleLinear().domain([0, 1]);
    this.y = d3.scaleBand().paddingOuter(0).paddingInner(0.4);
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .classed("vis", true)
      .append("div")
      .attr("class", `vis-container vis-top-scoring-teams is-${this.category}`);

    this.chartContainer = this.container
      .append("div")
      .attr("class", "svg-container");

    this.svg = this.chartContainer.append("svg").attr("class", "chart-svg");
    this.focusRect = this.svg
      .append("rect")
      .attr("class", "focus-rect")
      .attr("fill", "currentColor")
      .attr("display", "none");
    this.gY = this.svg.append("g").attr("class", "axis-g axis-g--y");
    this.gX = this.svg.append("g").attr("class", "axis-g axis-g--x");
    this.gBars = this.svg.append("g").attr("class", "bars-g");
    this.gLabels = this.svg.append("g").attr("class", "labels-g");
    this.captureRect = this.svg
      .append("rect")
      .attr("class", "capture-rect")
      .attr("fill", "none")
      .attr("y", this.marginTop)
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
    this.displayData = this.data.map((d, i) => ({
      name: this.accessor.name(d),
      counts: [
        {
          label: "Scored Goals",
          value: this.accessor.goalCount(d),
          idxDelay: i,
        },
        { label: "Dives", value: this.accessor.diveCount(d), idxDelay: i },
      ],
      goalDiveRatio: this.accessor.goalDiveRatio(d),
    }));

    this.displayData.forEach((d) => {
      const total = d3.sum(d.counts, (e) => e.value);
      let current = 0;
      d.counts.forEach((e, i) => {
        e.stack = [current, (current += e.value / total)];
        if (i === d.counts.length - 1) {
          e.stack[1] = 1;
        }
      });
    });

    this.legendData = [
      {
        label: "Scored Goals",
        symbol: "square",
      },
      {
        label: "Dives",
        symbol: "square",
      },
    ];

    this.legend.updateData(this.legendData);

    this.y.domain(this.displayData.map((d) => d.name));
  }

  resize() {
    const bcr = this.chartContainer.node().getBoundingClientRect();
    this.width = bcr.width;
    this.height = bcr.height;
    this.boundedWidth = this.width - this.marginLeft - this.marginRight;
    this.boundedHeight = this.height - this.marginTop - this.marginBottom;

    this.x.range([this.marginLeft, this.width - this.marginRight]);
    this.y.range([this.marginTop, this.height - this.marginBottom]);

    this.ys = this.y.domain().map(this.y);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);
    this.focusRect.attr("width", this.width).attr("height", this.y.step());
    this.captureRect
      .attr("width", this.width)
      .attr("height", this.boundedHeight);

    this.render();
  }

  render() {
    this.renderXAxis();
    this.renderYAxis();
    if (this.initialized) {
      this.renderBars();
      this.renderLabels();
    }
  }

  renderXAxis() {
    this.gX
      .attr(
        "transform",
        `translate(0,${this.height - this.marginBottom + this.xTickOffset})`
      )
      .call(
        d3
          .axisBottom(this.x)
          .tickValues([0, 0.5, 1])
          .tickFormat(d3.format("~%"))
          .tickSize(-this.boundedHeight - this.xTickOffset * 2)
          .tickPadding(8)
      )
      .call((g) => g.selectAll(".tick").classed("is-zero", (d) => d === 0));
  }

  renderYAxis() {
    this.gY
      .attr("transform", `translate(${this.marginLeft},0)`)
      .call(d3.axisLeft(this.y).tickSize(0).tickPadding(8));
  }

  renderBars() {
    this.barRow.attr("transform", (d) => `translate(0,${this.y(d.name)})`);
    this.bar
      .attr("x", (d, i) => (i ? this.x(d.stack[0]) : this.x(0)))
      .attr("width", (d, i) =>
        i ? this.x(1) - this.x(d.stack[0]) : this.x(d.stack[1]) - this.x(0)
      )
      .attr("height", this.y.bandwidth());
  }

  renderLabels() {
    this.labelRow.attr("transform", (d) => `translate(0,${this.y(d.name)})`);
    this.label
      .attr("x", (d, i) => (i ? this.x(1) : this.x(0)))
      .attr("y", this.y.bandwidth() / 2);
  }

  renderFocus() {
    if (this.idx === null) {
      this.focusRect.attr("display", "none");
      this.bar.classed("is-highlighted", false);
    } else {
      this.focusRect
        .attr("display", null)
        .attr(
          "transform",
          `translate(0,${
            this.y(this.y.domain()[this.idx]) -
            (this.y.step() - this.y.bandwidth()) / 2
          })`
        );
      this.bar.classed("is-highlighted", (d) => d.idxDelay === this.idx);
    }
  }

  async animate() {
    this.captureRect.attr("pointer-events", "none");

    this.barRow = this.gBars
      .selectAll(".row-g")
      .data(this.displayData, (d) => d.name)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "row-g")
          .attr("transform", (d) => `translate(0,${this.y(d.name)})`)
      );

    this.bar = this.barRow
      .selectAll(".bar-rect")
      .data((d) => d.counts)
      .join((enter) =>
        enter
          .append("rect")
          .attr("class", (d) => `bar-rect ${VisUtils.toKebabCase(d.label)}`)
          .attr("fill", "currentColor")
          .attr("height", this.y.bandwidth())
          .attr("x", (d, i) => (i ? this.x(1) : this.x(0)))
          .attr("width", 0)
      );

    this.labelRow = this.gLabels
      .selectAll(".row-g")
      .data(this.displayData, (d) => d.name)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "row-g")
          .attr("transform", (d) => `translate(0,${this.y(d.name)})`)
      );

    this.label = this.labelRow
      .selectAll(".bar-label")
      .data((d) => d.counts)
      .join((enter) =>
        enter
          .append("text")
          .attr("opacity", 0)
          .attr("class", "bar-label")
          .attr("fill", "#fff")
          .attr("dx", (d, i) => (i ? -4 : 4))
          .attr("dy", "0.32em")
          .attr("text-anchor", (d, i) => (i ? "end" : "start"))
          .attr("x", (d, i) => (i ? this.x(1) : this.x(0)))
          .attr("y", this.y.bandwidth() / 2)
          .text((d) => d.value)
      );

    await this.bar
      .transition()
      .duration(250)
      .delay((d, i) => d.idxDelay * 150)
      .attr("x", (d, i) => (i ? this.x(d.stack[0]) : this.x(0)))
      .attr("width", (d, i) =>
        i ? this.x(1) - this.x(d.stack[0]) : this.x(d.stack[1]) - this.x(0)
      )
      .end();

    await this.label.transition().duration(250).attr("opacity", 1);

    this.captureRect.attr("pointer-events", "all");

    this.initialized = true;
  }

  moved(event) {
    event.preventDefault();
    const [xp, yp] = d3.pointer(event);
    const idx = d3.bisectCenter(this.ys, yp);
    if (idx !== this.idx) {
      this.idx = idx;
      this.renderFocus();
      this.tooltip.show(this.tooltipContent());
    }
    this.tooltip.move(xp, this.ys[idx]);
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
      ${d.counts
        .map(
          (e) => `
        <div>
          <span class="tooltip-highlight">${
            e.value
          }</span> ${VisUtils.pluralize(d.value, e.label)}
        </div>
      `
        )
        .join("")}
      <div>
        Goals/Dives Ratio <span class="tooltip-highlight">${
          d.goalDiveRatio
        }</span>
      </div>
    `;
  }
}
