module.exports = function(eleventyConfig) {
  // Copy static assets
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("favicon.svg");

  // Add navigation plugin
  const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Add syntax highlighting
  const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
  eleventyConfig.addPlugin(syntaxHighlight);

  // Watch for CSS changes
  eleventyConfig.addWatchTarget("_includes/**/*.css");
  eleventyConfig.addWatchTarget("assets/**/*.css");

  // Custom filters
  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return new Date(dateObj).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  });

  // Collections
  eleventyConfig.addCollection("docs", function(collectionApi) {
    return collectionApi.getFilteredByGlob("*.md")
      .filter(item => !item.inputPath.includes('README.md'))
      .sort((a, b) => {
        const orderA = a.data.eleventyNavigation?.order || 999;
        const orderB = b.data.eleventyNavigation?.order || 999;
        return orderA - orderB;
      });
  });

  return {
    dir: {
      input: ".",
      output: "public",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",

    // Markdown options
    markdownLibrary: require("markdown-it")({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true
    })
    .use(require("markdown-it-anchor"), {
      permalink: false,
      level: [2, 3, 4]
    })
  };
};
