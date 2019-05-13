'use strict';

const chalk = require('chalk');

const transformFunctions = [
  // TODO: move previous transforming steps here as well
  postTransforms,
];

function postTransforms({ versionPrefix }) {
  return [
    // react-native
    {
      paths: ['RCTRedBox.m', 'RCTLog.m'],
      replace: /#if (ABI\d+_\d+_\d+)RCT_DEBUG/,
      with: '#if $1RCT_DEV',
    },
    {
      paths: ['NSTextStorage+FontScaling.h', 'NSTextStorage+FontScaling.m'],
      replace: /NSTextStorage \((ABI\d+_\d+_\d+)FontScaling\)/,
      with: `NSTextStorage (${versionPrefix}FontScaling)`,
    },
    {
      paths: ['NSTextStorage+FontScaling.h', 'NSTextStorage+FontScaling.m', 'RCTTextShadowView.m'],
      replace: /\b(scaleFontSizeToFitSize|scaleFontSizeWithRatio|compareToSize)\b/g,
      with: `${versionPrefix.toLowerCase()}_rct_$1`,
    },
    {
      paths: 'RCTWebView.m',
      replace: /@"ReactABI\d+_\d+_\d+-js-navigation"/,
      with: '@"react-js-navigation"',
    },

    // Universal modules
    {
      paths: `UniversalModules/${versionPrefix}EXScoped`,
      replace: /(EXScopedReactABI\d+_\d+_\d+Native)/g,
      with: 'EXScopedReactNative',
    },

    // react-native-maps
    {
      paths: 'AIRMapWMSTile',
      replace: /\b(TileOverlay)\b/g,
      with: `${versionPrefix}$1`,
    },
    {
      paths: 'AIRGoogleMapWMSTile',
      replace: /\b(WMSTileOverlay)\b/g,
      with: `${versionPrefix}$1`,
    },

    // react-native-svg
    {
      paths: 'RNSVGRenderable.m',
      replace: /\b(saturate)\(/g,
      with: `${versionPrefix}$1(`,
    },
    {
      paths: 'RNSVGPainter.m',
      replace: /\b(PatternFunction)\b/g,
      with: `${versionPrefix}$1`,
    },

    // react-native-webview
    {
      paths: 'RNCWKWebView.m',
      replace: new RegExp(`#import "${versionPrefix}objc/runtime\\.h"`, ''),
      with: '#import "objc/runtime.h"',
    },
    {
      paths: 'RNCWKWebView.m',
      replace: /\b(_SwizzleHelperWK)\b/g,
      with: `${versionPrefix}$1`,
    }
  ];
}

async function runTransformPipelineIOSAsync({ path, input, versionPrefix }) {
  let output = input;
  const matches = [];

  for (const transformFunction of transformFunctions) {
    const result = await transformFunction({ input: output, versionPrefix });

    if (Array.isArray(result)) {
      for (const transform of result) {
        if (!transform.paths || pathMatchesTransformPaths(path, transform.paths)) {
          const newOutput = output.replace(transform.replace, transform.with);

          if (newOutput.length !== output.length || newOutput !== output) {
            const regExpCaptures = copyRegExpCaptures();

            matches.push({
              value: RegExp.lastMatch,
              replacedWith: transform.with.replace(/\$[1-9]/g, m => regExpCaptures[m]),
            });
            output = newOutput;
          }
        }
      }
    } else if (typeof result === 'string') {
      output = result;
    }
  }

  if (matches.length > 0) {
    console.log(`Post-transforming ${chalk.yellow(path)}:`);

    for (const match of matches) {
      console.log(` ${chalk.blue(match.value)} -> ${chalk.green(match.replacedWith)}`);
    }
    console.log();
  }

  return output;
}

function pathMatchesTransformPaths(path, transformPaths) {
  if (typeof transformPaths === 'string') {
    return path.includes(transform.paths);
  }
  if (Array.isArray(transformPaths)) {
    return transformPaths.some(transformPath => path.includes(transformPath));
  }
  return false;
}

function copyRegExpCaptures() {
  return Array(9).fill(0).map((value, index) => `$${index + 1}`).reduce((acc, key) => {
    acc[key] = RegExp[key];
    return acc;
  }, {});
}

module.exports = {
  runTransformPipelineIOSAsync,
};
