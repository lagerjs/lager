'use strict';

const _ = require('lodash');
const Table = require('easy-table');

/**
 * Print information about the deployment of Lambdas
 * @param  {Array} reports
 * @return {void}
 */
module.exports = reports => {
  const t = new Table();
  _.forEach(reports, report => {
    t.cell('Name', report.name);
    t.cell('Operation', report.operation);
    t.cell('Version', report.publishedVersion);
    t.cell('Alias', report.aliasExisted === undefined ? '' : (report.aliasExisted ? 'Updated' : 'Created'));
    t.cell('ARN', report.arn);
    t.cell('Zip build time', formatHrTime(report.packageBuildTime) + ' ms');
    t.cell('Deploy time', formatHrTime(report.deployTime) + ' ms');
    t.newRow();
  });
  return 'Lambda functions deployed' + '\n\n' + t.toString() + '\n';
};

/**
 * Format the result of process.hrtime() into numeric with 3 decimals
 * @param  {Array} hrTime
 * @return {numeric}
 */
function formatHrTime(hrTime) {
  if (hrTime) {
    return Math.round(hrTime[0] * 1000 + hrTime[1] / 1000000);
  }
}
