const { matchJSONPath, matchXPath, matchHeader } = require('./queries');
const iconv = require('iconv-lite');


const isFilterableField = (field) => {
  return field !== 'raw' && field !== 'url';
}

const filterResponse = (context, field, filter, response, searchEnable, attributeCode, attributeFilter) => {
  if (searchEnable) {
    if (isFilterableField(field) && !attributeFilter) {
      throw new Error(`No ${attributeCode} filter specified`);
    }

   filter =  filterAttribute = `$[?(@.${attributeCode} == '${attributeFilter}')].` + filter
  }

  if (isFilterableField(field) && !filter) {
    throw new Error(`No ${field} filter specified`);
  }

  const sanitizedFilter = filter.trim();
  const bodyBuffer = context.util.models.response.getBodyBuffer(response, '');
  const match = response.contentType && response.contentType.match(/charset=([\w-]+)/);
  const charset = match && match.length >= 2 ? match[1] : 'utf-8';

  switch (field) {
    case 'header':
      return matchHeader(response.headers, sanitizedFilter);

    case 'url':
      return response.url;

    case 'raw':
      // Sometimes iconv conversion fails so fallback to regular buffer
      try {
        return iconv.decode(bodyBuffer, charset);
      } catch (err) {
        console.warn('[response] Failed to decode body', err);
        return bodyBuffer.toString();
      }

    case 'body':
      // Sometimes iconv conversion fails so fallback to regular buffer
      let body;
      try {
        body = iconv.decode(bodyBuffer, charset);
      } catch (err) {
        console.warn('[response] Failed to decode body', err);
        body = bodyBuffer.toString();
      }

      if (sanitizedFilter.indexOf('$') === 0) {
        let result = matchJSONPath(body, sanitizedFilter, searchEnable);
        if (!result.search(/(Returned no results:)/)) {
          return `${attributeFilter} Not Found`
        } else {
          return result
        }
      } else {
        return matchXPath(body, sanitizedFilter);
      }
    default:
      throw new Error(`Unknown field ${field}`);
  }
}

module.exports = { filterResponse, isFilterableField };
