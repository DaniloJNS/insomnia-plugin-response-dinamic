const shouldResendNow = (resendBehavior, maxAgeSeconds) => {
  let shouldResend;
  switch (resendBehavior) {
      case 'no-history':
        shouldResend = !response;
        break;

      case 'when-expired':
        if (!response) {
          shouldResend = true;
        } else {
          const ageSeconds = (Date.now() - response.created) / 1000;
          shouldResend = ageSeconds > maxAgeSeconds;
        }
        break;
      
      case 'always':
        shouldResend = true;
        break;

      case 'never':
      default:
        shouldResend = false;
        break;

  }

  return shouldResend
}


async function requestChain (context, request, resendBehavior, maxAgeSeconds) {
  // Make sure we only send the request once per render so we don't have infinite recursion
  
  let response = null;
  let shouldResend = shouldResendNow(resendBehavior, maxAgeSeconds)

  const requestChain = context.context.getExtraInfo('requestChain') || [];

  if (requestChain.some(id => id === request._id)) {
    console.log('[response tag] Preventing recursive render');
    shouldResend = false;
  }

  if (shouldResend && context.renderPurpose === 'send') {
    console.log('[response tag] Resending dependency');
    requestChain.push(request._id)
    response = await context.network.sendRequest(request, [
      { name: 'requestChain', value: requestChain }
    ]);
  }

  return response
}


module.exports = { requestChain, shouldResendNow }
