const state = {
  devtoolsPort: null,
  post: () => {},
  listeners: {},
  interceptors: {},
};

const handleCaptureMessage = msg => {
  const { action, blocking, events } = msg.data;

  if (action === 'start') {
    for (const e of events) {
      console.log(`Adding ${e} listener`);

      const extraSpec = ['onBeforeRequest'].includes(e) ? ['requestBody'] : [];
      if (
        blocking &&
        [
          'onAuthRequired',
          'onBeforeRequest',
          'onBeforeSendHeaders',
          'onHeadersReceived',
        ].includes(e)
      ) {
        extraSpec.push('blocking');
      }

      if (['onBeforeSendHeaders', 'onSendHeaders'].includes(e)) {
        extraSpec.push('requestHeaders');
      }

      if (
        [
          'onHeadersReceived',
          'onResponseStarted',
          'onCompleted',
          'onAuthRequired',
          'onBeforeRedirect',
        ].includes(e)
      ) {
        extraSpec.push('responseHeaders');
      }

      if (!(msg.tabId in state.listeners)) {
        state.listeners[msg.tabId] = {};
      }

      if (e === 'onErrorOccurred') {
        state.listeners[msg.tabId][e] = [
          data => {
            state.post(e, data);
          },
          { urls: ['<all_urls>'], tabId: msg.tabId },
        ];
        browser.webRequest[e].addListener(...state.listeners[msg.tabId][e]);
      } else {
        state.listeners[msg.tabId][e] = [
          data => {
            state.post(e, data);
          },
          { urls: ['<all_urls>'], tabId: msg.tabId },
          extraSpec,
        ];
        browser.webRequest[e].addListener(...state.listeners[msg.tabId][e]);
      }
    }
  } else if (action === 'stop') {
    if (msg.tabId in state.listeners) {
      for (const e in state.listeners[msg.tabId]) {
        console.debug(`Removing ${e} listener`);
        browser.webRequest[e].removeListener(state.listeners[msg.tabId][e][0]);
        delete state.listeners[msg.tabId][e];
      }
    }
  }
};

browser.runtime.onConnect.addListener(port => {
  state.devtoolsPort = port;
  state.post = (type, data) => {
    port.postMessage({
      type,
      data,
    });
  };

  console.log('devtools connected', port);

  port.onMessage.addListener(msg => {
    console.log('->bg', msg);

    switch (msg.type) {
      case 'capture':
        handleCaptureMessage(msg);
        break;

      case 'debug':
        for (const key in msg.data) {
          window[key] = msg.data[key];
        }
        break;

      default:
        break;
    }
  });

  state.post('welcome', 'hello');
});
