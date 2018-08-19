import postcssLoadConfig from 'postcss-load-config';
import postcss from 'postcss';

function process(plugins, css) {
	return postcss(plugins)
		.process(css)
		.then(code => ({ code }))
}

export default () => {
  const configPromise = postcssLoadConfig()
  return ({ content }) => configPromise.then(
    ({ plugins }) => process(plugins, content)
  )
}

