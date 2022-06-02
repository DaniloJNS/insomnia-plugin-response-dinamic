const { requestChain, shouldResendNow} = require("./chain")

async function RequestById(context, id) {
  const request = await context.util.models.request.getById(id);

  if (!request) {
    throw new Error(`Could not find request ${id}`);
  }
  
  return request
}

async function requestById (context, id, resendBehavior, maxAgeSeconds) {
  const environmentId = context.context.getEnvironmentId();

  let response = await context.util.models.response.getLatestForRequestId(id, environmentId);

  if (shouldResendNow(resendBehavior, maxAgeSeconds)) {
    response = requestChain(context, requestById(context, id), resendBehavior, maxAgeSeconds)
  };

  if (!response) {
    console.log('[response tag] No response found');
    throw new Error('No responses for request');
  }

  if (response.error) {
    console.log('[response tag] Response error ' + response.error);
    throw new Error('Failed to send dependent request ' + response.error);
  }

  if (!response.statusCode) {
    console.log('[response tag] Invalid status code ' + response.statusCode);
    throw new Error('No successful responses for request');
  }

  return response
}


module.exports = { requestById }
