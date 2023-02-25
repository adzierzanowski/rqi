export const REQ_EVENTS = [
  'onBeforeRequest',
  'onBeforeSendHeaders',
  'onSendHeaders',
  'onHeadersReceived',
  'onAuthRequired',
  'onBeforeRedirect',
  'onResponseStarted',
  'onErrorOccurred',
  'onCompleted',
];

export const REQ_EVENTS_STR = {
  onBeforeRequest: 'start',
  onBeforeSendHeaders: 'before send headers',
  onSendHeaders: 'send headers',
  onHeadersReceived: 'got headers',
  onAuthRequired: 'auth required',
  onBeforeRedirect: 'redirect',
  onResponseStarted: 'response start',
  onErrorOccurred: 'error',
  onCompleted: 'complete',
};
