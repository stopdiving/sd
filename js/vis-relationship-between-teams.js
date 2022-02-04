class VisRelationshipBetweenTeams {
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
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkLKyQZobPBXxqYcSpmgyHaINd_P-0QS3pU2HxEIeDblrs7R5Hk6gFFZb6Q2Iv4dBy_Q2VrRNBmBTh/pub?gid=135998558&single=true&output=csv";
    const womensDataUrl =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTkLKyQZobPBXxqYcSpmgyHaINd_P-0QS3pU2HxEIeDblrs7R5Hk6gFFZb6Q2Iv4dBy_Q2VrRNBmBTh/pub?gid=995619981&single=true&output=csv";

    try {
      const [men, women] = await new VisDataLoader(this.el).get([
        mensDataUrl,
        womensDataUrl,
      ]);
      this.data = { men, women };
      this.setup();
      this.scaffold();
      this.resize();
      this.wrangle();
      VisUtils.observe(this.svg.node(), this.animate);
      window.addEventListener("resize", this.resize);
    } catch (error) {
      console.error(error);
    }
  }

  setup() {
    this.active = null;
    this.selected = "men";

    this.accessor = {
      source: (d) => d["Diving Team"],
      target: (d) => d["Affected Team"],
      impactCount: (d) => +d["Impact"],
    };

    this.marginTop = 32;
    this.marginRight = 32;
    this.marginBottom = 8;
    this.marginLeft = 32;
    this.nodeWidth = 4;
    this.nodePadding = 20;

    this.sankey = d3
      .sankey()
      .nodeId((d) => d.id)
      .nodeSort(
        (a, b) => d3.descending(a.value, b.value) || d3.ascending(a.id, b.id)
      )
      .linkSort(
        (a, b) => d3.descending(a.value, b.value) || d3.ascending(a.id, b.id)
      )
      .nodeWidth(4)
      .nodePadding(4);
  }

  scaffold() {
    this.container = d3
      .select(this.el)
      .classed("vis", true)
      .append("div")
      .attr("class", "vis-container vis-relationship-between-teams");

    this.toggleContainer = this.container
      .append("div")
      .attr("class", "toggle-container");

    new VisToggle(this.toggleContainer.node(), [
      { value: "men", label: "Men's", selected: true },
      { value: "women", label: "Women's" },
    ]);

    this.toggleContainer.on("change", (event) => {
      this.selected = event.target.value;
      this.active = null;
      this.wrangle();
      this.animate();
    });

    this.chartContainer = this.container
      .append("div")
      .attr("class", "svg-container");

    this.svg = this.chartContainer
      .append("svg")
      .attr("class", "chart-svg")
      .style("pointer-events", "none")
      .on("pointerover", this.moved)
      .on("pointermove", this.moved)
      .on("pointerout", this.outed);
    this.gColumnTitles = this.svg
      .append("g")
      .attr("class", "column-titles-g")
      .attr("fill", "currentColor");
    this.gLinks = this.svg
      .append("g")
      .attr("class", "links-g")
      .attr("stroke", "currentColor")
      .attr("fill", "none");
    this.gNodes = this.svg
      .append("g")
      .attr("class", "nodes-g")
      .attr("fill", "currentColor");
    this.gLabels = this.svg
      .append("g")
      .attr("class", "labels-g")
      .attr("fill", "currentColor");
    this.gValues = this.svg
      .append("g")
      .attr("class", "values-g")
      .attr("fill", "currentColor");

    this.tooltip = new VisTooltip(this.chartContainer.node());
  }

  wrangle() {
    if (!this.graph) {
      this.graph = {};
      ["men", "women"].forEach((category) => {
        const nodes = [];
        const links = [];
        const nodeByKey = new Map();
        const linkByKey = new Map();

        this.data[category].forEach((d) => {
          if (this.accessor.impactCount(d) > 0) {
            const sourceName = this.accessor.source(d);
            const sourceId = `source-${sourceName}`;
            const targetName = this.accessor.target(d);
            const targetId = `target-${targetName}`;
            const linkId = `${sourceId}-${targetId}`;

            if (!nodeByKey.has(sourceId)) {
              const node = {
                id: sourceId,
                name: sourceName,
                type: "source",
              };
              nodes.push(node);
              nodeByKey.set(sourceId, node);
            }
            if (!nodeByKey.has(targetId)) {
              const node = {
                id: targetId,
                name: targetName,
                type: "target",
              };
              nodes.push(node);
              nodeByKey.set(targetId, node);
            }
            if (!linkByKey.has(linkId)) {
              const link = {
                id: linkId,
                source: sourceId,
                target: targetId,
                value: 0,
              };
              links.push(link);
              linkByKey.set(linkId, link);
            }
            const link = linkByKey.get(linkId);
            link.value += this.accessor.impactCount(d);
          }
        });

        this.graph[category || d3.ascending(a.id, b.id)] = { nodes, links };
      });
    }

    this.displayData = this.sankey(this.graph[this.selected]);

    this.container
      .classed("is-men", this.selected === "men")
      .classed("is-women", this.selected === "women");
  }

  resize() {
    const bcr = this.chartContainer.node().getBoundingClientRect();
    this.width = bcr.width;
    this.height = bcr.height;

    this.sankey.extent([
      [this.marginLeft, this.marginTop],
      [this.width - this.marginRight, this.height - this.marginBottom],
    ]);

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    if (this.displayData) {
      this.displayData = this.sankey(this.graph[this.selected]);
      this.render();
    }
  }

  render() {
    this.renderColumnTitles();
    this.renderNodes();
    this.renderLinks();
    this.renderLabels();
  }

  renderColumnTitles() {
    this.gColumnTitles
      .selectAll(".column-title")
      .data([
        { title: "Diving team", x: this.marginLeft, textAnchor: "start" },
        {
          title: "Affected team",
          x: this.width - this.marginRight,
          textAnchor: "end",
        },
      ])
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "column-title")
          .attr("text-anchor", (d) => d.textAnchor)
          .attr("y", this.marginTop - 12)
          .text((d) => d.title)
      )
      .attr("x", (d) => d.x);
  }

  renderNodes() {
    this.node = this.gNodes
      .selectAll(".node-rect")
      .data(this.displayData.nodes, (d) => d.id)
      .join((enter) => enter.append("rect").attr("class", "node-rect"))
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("width", (d) => d.x1 - d.x0);
  }

  renderLinks() {
    this.link = this.gLinks
      .selectAll(".link-path")
      .data(this.displayData.links, (d) => d.id)
      .join((enter) =>
        enter
          .append("path")
          .attr("class", "link-path")
          .attr("pathLength", 1)
          .attr("stroke-dasharray", 1)
          .attr("stroke-dashoffset", 1)
          .attr("stroke", "currentColor")
      )
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke-width", (d) => d.width);
  }

  renderLabels() {
    this.label = this.gLabels
      .selectAll(".label-text")
      .data(this.displayData.nodes, (d) => d.id)
      .join((enter) =>
        enter.append("text").attr("class", "label-text").attr("dy", "0.32em")
      )
      .attr("x", (d) => (d.x0 < this.width / 2 ? d.x1 + 6 : d.x0 - 6))
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("text-anchor", (d) => (d.x0 < this.width / 2 ? "start" : "end"))
      .text((d) => d.name);
  }

  async animate() {
    this.svg.style("pointer-events", "none");
    this.render();
    await this.link
      .attr("stroke-dashoffset", 1)
      .transition()
      .duration(1000)
      .attr("stroke-dashoffset", 0)
      .end();
    this.svg.style("pointer-events", null);
  }

  moved(event) {
    event.preventDefault();
    event.stopPropagation();
    if (
      event.target.classList.contains("node-rect") ||
      event.target.classList.contains("label-text") ||
      event.target.classList.contains("link-path")
    ) {
      const d = d3.select(event.target).datum();
      if (this.active !== d) {
        this.active = d;
        this.highlight();
      }
    }
  }

  outed(event) {
    event.preventDefault();
    event.stopPropagation();
    this.active = null;
    this.highlight();
  }

  highlight() {
    if (this.active) {
      const activeNodes = new Map();
      const activeLinks = new Set();
      if (this.active.name) {
        // active node
        activeNodes.set(this.active.id, {
          value: this.active.value,
          x:
            this.active.x0 < this.width / 2
              ? this.active.x0 - 6
              : this.active.x1 + 6,
          y: (this.active.y1 + this.active.y0) / 2,
        });
        [...this.active.sourceLinks, ...this.active.targetLinks].forEach(
          (d) => {
            let node;
            if (this.active.type === "source") {
              node = d.target;
            } else if (this.active.type === "target") {
              node = d.source;
            }
            activeNodes.set(node.id, {
              value: d.value,
              x: node.x0 < this.width / 2 ? node.x0 - 6 : node.x1 + 6,
              y: (node.y1 + node.y0) / 2,
            });
            activeLinks.add(d.id);
          }
        );
      } else {
        // active link
        activeNodes.set(this.active.source.id, {
          value: this.active.value,
          x:
            this.active.source.x0 < this.width / 2
              ? this.active.source.x0 - 6
              : this.active.source.x1 + 6,
          y: (this.active.source.y1 + this.active.source.y0) / 2,
        });
        activeNodes.set(this.active.target.id, {
          value: this.active.value,
          x:
            this.active.target.x0 < this.width / 2
              ? this.active.target.x0 - 6
              : this.active.target.x1 + 6,
          y: (this.active.target.y1 + this.active.target.y0) / 2,
        });
        activeLinks.add(this.active.id);
      }
      this.node
        .classed("is-active", (d) => activeNodes.has(d.id))
        .classed("is-muted", (d) => !activeNodes.has(d.id));
      this.link
        .classed("is-active", (d) => activeLinks.has(d.id))
        .classed("is-muted", (d) => !activeLinks.has(d.id));
      this.label
        .classed("is-active", (d) => activeNodes.has(d.id))
        .classed("is-muted", (d) => !activeNodes.has(d.id));
      this.gValues
        .selectAll(".value-text")
        .data(Array.from(activeNodes.values()))
        .join((enter) =>
          enter.append("text").attr("class", "value-text").attr("dy", "0.32em")
        )
        .attr("x", (d) => d.x)
        .attr("y", (d) => d.y)
        .attr("text-anchor", (d) => (d.x < this.width / 2 ? "end" : "start"))
        .text((d) => d.value);
    } else {
      this.node.classed("is-active is-muted", false);
      this.link.classed("is-active is-muted", false);
      this.label.classed("is-active is-muted", false);
      this.gValues.selectAll("*").remove();
    }
  }
}
