const { filterResponse ,isFilterableField } = require('./filters/filters');
const { matchJSONPath, matchXPath, matchHeader } = require('./filters/queries');
const { requestById } = require("./requests/request")
const iconv = require('iconv-lite');

const defaultTriggerBehaviour = 'never';
const defaultAttribute = 'default';
const display = [
     {
      displayName: 'Request',
      type: 'model',
      model: 'Request',
    },
      {
        displayName: 'Attribute',
        type: 'enum',
        options: [
          {
            displayName: 'Body Attribute',
            description: 'value of response body',
            value: 'body',
          },
          {
            displayName: 'Raw Body',
            description: 'entire response body',
            value: 'raw',
          },
          {
            displayName: 'Header',
            description: 'value of response header',
            value: 'header',
          },
          {
            displayName: 'Request URL',
            description: 'Url of initiating request',
            value: 'url',
          },
        ],
      },
      {
        type: 'string',
        encoding: 'base64',
        hide: args => !isFilterableField(args[0].value),
        displayName: args => {
          switch (args[0].value) {
            case 'body':
              return 'Filter (JSONPath or XPath)';
            case 'header':
              return 'Header Name';
            default:
              return 'Filter';
          }
        },
      },
      {
        displayName: 'Trigger Behavior',
        help: 'Configure when to resend the dependent request',
        type: 'enum',
        defaultValue: defaultTriggerBehaviour,
        options: [
          {
            displayName: 'Never',
            description: 'never resend request',
            value: 'never',
          },
          {
            displayName: 'No History',
            description: 'resend when no responses present',
            value: 'no-history',
          },
          {
            displayName: 'When Expired',
            description: 'resend when existing response has expired',
            value: 'when-expired',
          },
          {
            displayName: 'Always',
            description: 'resend request when needed',
            value: 'always',
          },
        ],
      },
      {
        displayName: 'Max age (seconds)',
        help: 'The maximum age of a response to use before it expires',
        type: 'number',
        hide: args => {
          const triggerBehavior = (args[3] && args[3].value) || defaultTriggerBehaviour;
          return triggerBehavior !== 'when-expired';
        },
        defaultValue: 60,
      },
      {
        displayName: 'Search Attribute',
        type: 'boolean',
        hide: args => !isFilterableField(args[0].value),
        help: 'If this is enabled, the value when input will be masked like a password field.',
        defaultValue: false,
      },
      {
        displayName: 'Search Attribute By Code',
        type: 'enum',
        defaultValue: defaultAttribute,
        hide: args => !args[args.length - 3].value,
        options: [],
      },
      {
        type: 'string',
        encoding: 'base64',
        defaultValue: false,
        hide: args => !args[args.length - 3].value,
        displayName: "MatchEqual"
      }
    ]

module.exports.templateTags = [{
    name: 'responseCustomizable',
    displayName: 'Response customizable',
    description: 'Query a chain response with enviroment and prompt',
    args: display,
    async run (context, id, field, filter, resendBehavior, maxAgeSeconds, searchEnable, attributeCode, attributeFilter) {
      filter = filter || '';
      resendBehavior = (resendBehavior || defaultTriggerBehaviour).toLowerCase();

      if (!['body', 'header', 'raw', 'url'].includes(field)) {
        throw new Error(`Invalid response field ${field}`);
      }

      if (!id) {
        throw new Error('No request specified');
      }

      const request = await context.util.models.request.getById(id);

      if (!request) {
        throw new Error(`Could not find request ${id}`);
      }

      let response = await requestById(context, id, resendBehavior, maxAgeSeconds)

      updateDisplay(displayAttributes(context, response))

      if (!attributeCode) {
        throw new Error(`Could not find attributeCode ${attributeCode}`);
      }

      return filterResponse(context, field, filter, response, searchEnable, attributeCode, attributeFilter)
}}];

let shouldUpdateAttribute = false

const updateDisplay =  (data) => {
    display[display.length - 2].options = data;
}

const displayAttributes = (context, response) => {
  body = sanitaizedResponse(context, response);

  return costumerOptions(body);
}

const sanitaizedResponse =  (context, response) => {
  const bodyBuffer = context.util.models.response.getBodyBuffer(response, '');
  const match = response.contentType && response.contentType.match(/charset=([\w-]+)/);
  const charset = match && match.length >= 2 ? match[1] : 'utf-8';

  try {
    body = iconv.decode(bodyBuffer, charset);
  } catch (err) {
    console.warn('[response] Failed to decode body', err);
    body = bodyBuffer.toString();
  }

  return JSON.parse(bodyBuffer);
}

const costumerOptions = (response) => {
  return Object.keys(response[0]).map(key => customOption(key))
}

const customOption = (value) => {
  return { 
    displayName: value,
    description: `the attribute ${value}`,
    value: value,
  }
}
