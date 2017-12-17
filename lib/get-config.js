const readPkgUp = require('read-pkg-up');
const {castArray, pickBy, isUndefined, isNull} = require('lodash');
const cosmiconfig = require('cosmiconfig');
const importFrom = require('import-from');
const debug = require('debug')('semantic-release:config');
const {repoUrl} = require('./git');
const plugins = require('./plugins');

module.exports = async (opts, logger) => {
  const {config} = (await cosmiconfig('release', {rcExtensions: true}).load(process.cwd())) || {};
  // Merge config file options and CLI/API options
  let options = {...config, ...opts};
  let extendPaths;
  ({extends: extendPaths, ...options} = options);
  if (extendPaths) {
    // If `extends` is defined, load and merge each shareable config with `options`
    options = {
      ...castArray(extendPaths).reduce(
        (result, extendPath) => ({
          ...result,
          ...(importFrom.silent(__dirname, extendPath) || importFrom(process.cwd(), extendPath)),
        }),
        {}
      ),
      ...options,
    };
  }

  // Set default options values if not defined yet
  options = {
    branch: 'master',
    repositoryUrl: (await pkgRepoUrl()) || (await repoUrl()),
    // Remove `null` and `undefined` options so they can be replaced with default ones
    ...pickBy(options, option => !isUndefined(option) && !isNull(option)),
  };

  debug('options values: %O', Object.keys(options));
  debug('name: %O', options.name);
  debug('branch: %O', options.branch);
  debug('repositoryUrl: %O', options.repositoryUrl);
  debug('analyzeCommits: %O', options.analyzeCommits);
  debug('generateNotes: %O', options.generateNotes);
  debug('verifyConditions: %O', options.verifyConditions);
  debug('verifyRelease: %O', options.verifyRelease);
  debug('publish: %O', options.publish);

  return {options, plugins: await plugins(options, logger)};
};

async function pkgRepoUrl() {
  const {pkg} = await readPkgUp();
  return pkg && pkg.repository ? pkg.repository.url : undefined;
}
