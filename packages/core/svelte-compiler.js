import htmlparser from 'htmlparser2';
import sourcemap from 'source-map';
import svelte from 'svelte';
import postcssPreprocessor from './postcssPreprocessor';


SvelteCompiler = class extends CachingCompiler {
  constructor(options = {}) {
    super({
      compilerName: 'svelte',
      defaultCacheSize: 1024 * 1024 * 10
    });

    this.options = options;

    // Will read the default settings from package.json @TODO: Add possibility to define options
    this.postCssPreprocessor = postcssPreprocessor();
    
  }

  getCacheKey(file) {
    return [
      this.options,
      file.getPathInPackage(),
      file.getSourceHash(),
      file.getArch()
    ];
  }

  // The compile result returned from `compileOneFile` can be an array or an
  // object. If the processed HTML file is not a Svelte component, the result is
  // an array of HTML sections (head and/or body). Otherwise, it's an object
  // with JavaScript from a compiled Svelte component.
  compileResultSize(result) {
    let size = 0;
    if (Array.isArray(result)) {
      result.forEach(section => size += section.data.length);
    } else {
      size = result.data.length + result.sourceMap.toString().length;
    }

    return size;
  }

  addCompileResult(inputFile, compileResult) {
    if (Array.isArray(compileResult)) {
      compileResult.forEach(section => inputFile.addHtml(section));
    } else {
      inputFile.addJavaScript(compileResult);
    }
  }

  async compileOneFile(file) {
    const raw = file.getContentsAsString();
    const basename = file.getBasename();
    const path = file.getPathInPackage();
    const extension = path.substring(path.lastIndexOf('.') + 1);

    if (extension === 'html') {
      let isSvelteComponent = true;
      const sections = [];

      // Search for top level head and body tags. If at least one of these tags
      // exists, the file is not processed with the Svelte compiler. Instead,
      // the inner HTML of the tags is added to the respective section in the
      // HTML output generated by Meteor.
      htmlparser.parseDOM(raw).forEach(el => {
        if (el.name === 'head' || el.name === 'body') {
          isSvelteComponent = false;

          sections.push({
            section: el.name,
            data: htmlparser.DomUtils.getInnerHTML(el).trim()
          });
        }
      });

      if (!isSvelteComponent) {
        return sections;
      }
    }

    const svelteOptions = {
      dev: process.env.NODE_ENV !== 'production',
      filename: path,
      name: basename
        .slice(0, basename.indexOf('.')) // Remove extension
        .replace(/[^a-z0-9_$]/ig, '_') // Ensure valid identifier
    };

    if (file.getArch().startsWith('os.')) {
      svelteOptions.generate = 'ssr';
    } else {
      const { hydratable, css } = this.options;

      if (hydratable === true) {
        svelteOptions.hydratable = true;
      }

      if (css === false) {
        svelteOptions.css = false;
      }
    }

    try {
      const processed = await svelte.preprocess(raw, {
        style: this.postCssPreprocessor
      });
      const compiled = svelte.compile(processed.toString(), svelteOptions);
      return this.transpileWithBabel(compiled.js, path);
    } catch (e) {
      // Throw unknown errors.
      if (!e.start) {
        throw e;
      }

      let message;

      if (e.frame) {
        // Prepend a vertical bar to each line to prevent Meteor from trimming
        // whitespace and moving the code frame indicator to the wrong position.
        const frame = e.frame.split('\n').map(line => {
          return `| ${line}`;
        }).join('\n');

        message = `${e.message}\n\n${frame}`;
      } else {
        message = e.message;
      }

      file.error({
        message,
        line: e.start.line,
        column: e.start.column
      });
    }
  }

  transpileWithBabel(source, path) {
    const options = Babel.getDefaultOptions();
    options.filename = path;
    options.sourceMaps = true;

    const transpiled = Babel.compile(source.code, options);

    return {
      sourcePath: path,
      path,
      data: transpiled.code,
      sourceMap: this.combineSourceMaps(transpiled.map, source.map)
    };
  }

  // Generates a new source map that maps a file transpiled by Babel back to the
  // original HTML via a source map generated by the Svelte compiler.
  combineSourceMaps(babelMap, svelteMap) {
    const result = new sourcemap.SourceMapGenerator;

    const babelConsumer = new sourcemap.SourceMapConsumer(babelMap);
    const svelteConsumer = new sourcemap.SourceMapConsumer(svelteMap);

    babelConsumer.eachMapping(mapping => {
      // Ignore mappings that don't have a source.
      if (!mapping.source) {
        return;
      }

      const position = svelteConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn
      });

      // Ignore mappings that don't map to the original HTML.
      if (!position.source) {
        return;
      }

      result.addMapping({
        source: position.source,
        original: {
          line: position.line,
          column: position.column
        },
        generated: {
          line: mapping.generatedLine,
          column: mapping.generatedColumn
        }
      });
    });

    // Copy source content from the source map generated by the Svelte compiler.
    // We can just take the first entry because only one file is involved in the
    // Svelte compilation and Babel transpilation.
    result.setSourceContent(
      svelteMap.sources[0],
      svelteMap.sourcesContent[0]
    );

    return result.toJSON();
  }
};