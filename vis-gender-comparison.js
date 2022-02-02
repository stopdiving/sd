class VisGenderComparison {
  constructor(el) {
    this.el = el;
    this.animate = this.animate.bind(this);
    this.moved = this.moved.bind(this);
    this.outed = this.outed.bind(this);
    this.init();
  }

  async init() {
    const dataUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkLKyQZobPBXxqYcSpmgyHaINd_P-0QS3pU2HxEIeDblrs7R5Hk6gFFZb6Q2Iv4dBy_Q2VrRNBmBTh/pub?gid=1109042968&single=true&output=csv";

    try {
      [this.data] = await new VisDataLoader(this.el).get([dataUrl]);
      this.setup();
      this.scaffold();
      this.wrangle();
      this.render();
      VisUtils.observe(this.svg.node(), this.animate);
    } catch (error) {
      console.error(error);
    }
  }

  setup() {
    this.active = null;

    this.nColumns = 10;
    this.nRows = 10;
    this.gridSize = 20;
    this.width = this.gridSize * this.nColumns;
    this.height = this.gridSize * this.nRows;
    this.iconPath =
      "M96 0c35.346 0 64 28.654 64 64s-28.654 64-64 64-64-28.654-64-64S60.654 0 96 0m48 144h-11.36c-22.711 10.443-49.59 10.894-73.28 0H48c-26.51 0-48 21.49-48 48v136c0 13.255 10.745 24 24 24h16v136c0 13.255 10.745 24 24 24h64c13.255 0 24-10.745 24-24V352h16c13.255 0 24-10.745 24-24V192c0-26.51-21.49-48-48-48z";

    this.accessor = {
      diveCount: (d) => d["Dive count"],
      men: (d) => parseInt(d["Percentage Men's"]),
      women: (d) => parseInt(d["Percentage Women's"]),
    };
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .classed("vis", true)
      .append("div")
      .attr("class", "vis-gender-comparison");

    this.container
      .node()
      .append(
        new Comment(
          `Male icon from Font Awesome Free 5.15.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) `
        )
      );

    this.categoryContainer = this.container
      .selectAll(".category-container")
      .data(["men", "women"])
      .join("div")
      .attr("class", "category-container");

    this.categoryContainer
      .append("div")
      .attr("class", "category-title")
      .text((d) => d);

    this.svg = this.categoryContainer
      .append("svg")
      .attr("class", "chart-svg--non-positioned")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("pointer-events", "none")
      .on("pointerover", this.moved)
      .on("pointermove", this.moved)
      .on("pointerout", this.outed);

    this.tooltip = new VisTooltip(this.container.node());
  }

  wrangle() {
    this.displayData = ["men", "women"].map((category, i) => {
      const data = this.data
        .map((d) => ({
          diveCount: this.accessor.diveCount(d),
          percentage: this.accessor[category](d),
        }))
        .reduce((data, d) => {
          data = data.concat(
            d3.range(d.percentage).map(() => ({
              diveCount: d.diveCount,
              percentage: d.percentage,
            }))
          );
          return data;
        }, [])
        .slice(0, this.nColumns * this.nRows)
        .map((d, i) => ({
          index: i,
          row: this.nColumns - 1 - Math.floor(i / this.nColumns),
          column: i % this.nColumns,
          diveCount: d.diveCount,
          category,
          percentage: d.percentage,
          className: VisUtils.toKebabCase(`dives-${d.diveCount}`),
        }));
      data.category = category;
      data.i = i;
      return data;
    });
  }

  render() {
    this.icon = this.svg
      .data(this.displayData)
      .selectAll(".icon-path")
      .data((d) => d)
      .join((enter) =>
        enter
          .append("path")
          .attr("class", (d) => `icon-path is-${d.category} ${d.className}`)
          .attr("fill", "currentColor")
          .attr(
            "transform",
            (d) =>
              `translate(${d.column * this.gridSize},${
                d.row * this.gridSize
              })scale(0.035)`
          )
          .attr("d", this.iconPath)
          .attr("fill-opacity", 0)
      );
  }

  async animate() {
    this.svg.style("pointer-events", "none");

    await this.icon
      .transition()
      .duration(150)
      .delay((d, i) => i * 20)
      .attr("fill-opacity", 1)
      .end();

    this.svg.style("pointer-events", null);
  }

  moved(event) {
    const i = d3.select(event.currentTarget).datum().i;
    const [x, y] = d3.pointer(event);
    const idxColumn = Math.floor(x / this.gridSize);
    const idxRow = Math.floor(y / this.gridSize);
    const idx = (this.nRows - idxRow - 1) * this.nColumns + idxColumn;
    const d = this.displayData[i][idx];

    if (this.active !== d) {
      this.active = d;
      this.tooltip.show(this.tooltipContent());
      this.highlight();
    }
    this.tooltip.move(...d3.pointer(event, this.container.node()));
  }

  outed() {
    this.active = null;
    this.tooltip.hide();
    this.highlight();
  }

  highlight() {
    if (this.active) {
      this.icon.classed(
        "is-active",
        (d) =>
          d.category === this.active.category &&
          d.diveCount === this.active.diveCount
      );
    } else {
      this.icon.classed("is-active", false);
    }
  }

  tooltipContent() {
    return `
      <div>
        <span class="tooltip-highlight" style="text-transform: capitalize">${
          this.active.category
        }</span>
      </div>
      <div>
        <span class="tooltip-highlight">${this.active.percentage}%</span> ${
      this.active.diveCount
    } ${VisUtils.pluralize(this.active.diveCount === "1" ? 1 : 0, "Dives")}
      </div>
    `;
  }
}
