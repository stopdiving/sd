class VisDataLoader {
  constructor(el) {
    this.el = el;
  }

  async get(dataUrls) {
    this.renderSpinner();
    try {
      const data = await Promise.all(
        dataUrls.map((dataUrl) => d3.csv(dataUrl))
      );
      this.removeSpinner();
      return data;
    } catch (error) {
      this.removeSpinner();
      this.renderError();
      throw new Error(error);
    }
  }

  renderSpinner() {
    d3.select(this.el).html(
      `<div class="vis vis-center"><div class="vis-spinner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>`
    );
  }

  removeSpinner() {
    d3.select(this.el).html("");
  }

  renderError() {
    const errorMessage =
      "Can't retrieve the data at the moment. Please try again later.";
    d3.select(this.el).html(
      `<div class="vis vis-center"><div class="vis-error">${errorMessage}</div></div>`
    );
  }
}
