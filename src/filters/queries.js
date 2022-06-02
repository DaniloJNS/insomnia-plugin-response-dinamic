const { JSONPath } = require('jsonpath-plus');
const { query: queryXPath } = require('insomnia-xpath');

const matchJSONPath = (bodyStr, query, searhEnable) => {
  let body;
  let results;

  try {
    body = JSON.parse(bodyStr);
  } catch (err) {
    throw new Error(`Invalid JSON: ${err.message}`);
  }

  try {
    results = JSONPath({json: body, path: query});
  } catch (err) {
    throw new Error(`Invalid JSONPath query: ${query}`);
  }

  if (results.length === 0) {
    if (searhEnable) {
      return `Not Found`
    } else {
      throw new Error(`Returned no results: ${query}`);
    }
  } else if (results.length > 1) {
    throw new Error(`Returned more than one result: ${query}`);
  }

  if (typeof results[0] !== 'string') {
    return JSON.stringify(results[0]);
  } else {
    return results[0];
  }
}
const matchXPath = (bodyStr, query) => {
  const results = queryXPath(bodyStr, query);

  if (results.length === 0) {
    throw new Error(`Returned no results: ${query}`);
  } else if (results.length > 1) {
    throw new Error(`Returned more than one result: ${query}`);
  }

  return results[0].inner;
}

const matchHeader = (headers, name) => {
  if (!headers.length) {
    throw new Error('No headers available');
  }

  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());

  if (!header) {
    const names = headers.map(c => `"${c.name}"`).join(',\n\t');
    throw new Error(`No header with name "${name}".\nChoices are [\n\t${names}\n]`);
  }

  return header.value;
}

module.exports = {
  matchJSONPath,
  matchXPath,
  matchHeader
}
