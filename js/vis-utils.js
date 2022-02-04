const VisUtils = (() => {
  const utils = {};

  utils.toKebabCase = (text) => text.toLowerCase().replace(/[\W_]+/g, "-");

  utils.observe = (el, callback) => {
    if ("IntersectionObserver" in window) {
      let observer = new IntersectionObserver(
        (entries) => {
          const el = entries[0];
          if (!el.isIntersecting) return;
          observer.unobserve(el.target);
          callback();
          observer = null;
        },
        {
          rootMargin: "0% 0% -100px 0%",
        }
      );
      observer.observe(el);
    } else {
      callback();
    }
  };

  utils.pluralize = (count, unit) => {
    switch (unit) {
      case "Dives":
        return count === 1 ? "Dive" : "Dives";
      case "Dives/Match":
        return count === 1 ? "Dive/Match" : "Dives/Match";
      case "Dives/Hour":
        return count === 1 ? "Dive/Hour" : "Dives/Hour";
      case "Scored Goals":
        return count === 1 ? "Scored Goal" : "Scored Goals";
      default:
        break;
    }
  };

  // https://gist.github.com/gordonbrander/2230317
  utils.id = () => "_" + Math.random().toString(36).slice(2, 11);

  return utils;
})();
