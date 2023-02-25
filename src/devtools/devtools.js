import { messageSender } from '../utils/msg.js';
import { listen, checked, create, create_, val } from '../utils/dom.js';
import { REQ_EVENTS, REQ_EVENTS_STR } from '../utils/req.js';

const port = browser.runtime.connect(undefined, { name: 'rqi-devtools' });

const state = {
  port,
  tabId: browser.devtools.inspectedWindow.tabId,
  requests: new Map(),
};

const showDetail = (detail, event) => {
  const target = document.getElementById('request');
  const url = new URL(detail.url);
  target.innerHTML = '';
  const [detailNode, detailNodes] = create_({
    tag: 'div',
    attr: { class: 'detail' },
    children: [
      {
        tag: 'div',
        attr: { class: 'detail__header' },
        children: [
          { tag: 'span', innerText: 'Request ' },
          {
            tag: 'span',
            attr: { class: 'detail__request-id' },
            innerText: `#${detail.requestId}`,
          },
          { tag: 'span', innerText: ' @ ' },
          {
            tag: 'span',
            attr: { class: 'detail__event' },
            innerText: `${event}`,
          },
        ],
      },
      { tag: 'div', innerText: `${detail.method} ${url.pathname}` },
      {
        tag: 'div',
        innerText: 'Search Params',
        attr: { class: 'detail__url-params' },
        style:
          [...url.searchParams.keys()].length === 0 ? { display: 'none' } : {},
        children: [{ tag: 'table', uid: 'urlParams' }],
      },
      {
        tag: 'div',
        innerText: 'Headers',
        attr: { class: 'detail__headers' },
        children: [{ tag: 'table', uid: 'headers' }],
      },
      { tag: 'hr' },
      {
        tag: 'div',
        attr: { class: 'detail__raw' },
        children: [
          {
            tag: 'pre',
            innerHTML: JSON.stringify(detail, undefined, 2).replace(
              /(".*?"):/gm,
              '<span style="color: lightgreen;">$1</span>:'
            ),
          },
        ],
      },
    ],
  });

  for (const { name, value } of detail?.requestHeaders ??
    detail?.responseHeaders ??
    []) {
    const [tr] = create_({
      tag: 'tr',
      children: [
        { tag: 'td', innerText: name },
        { tag: 'td', innerText: value },
      ],
    });
    detailNodes.headers.appendChild(tr);
  }

  url.searchParams.forEach((v, k) => {
    const [tr] = create_({
      tag: 'tr',
      children: [
        { tag: 'td', innerText: k },
        { tag: 'td', innerText: v },
      ],
    });
    detailNodes.urlParams.appendChild(tr);
  });
  target.appendChild(detailNode);
};

const refreshList = () => {
  const list = document.getElementById('requests');
  list.innerHTML = '';

  for (const [reqId, req] of state.requests) {
    const before = req.get('onBeforeRequest');
    const skeleton = {
      tag: 'div',
      uid: 'root',
      attr: { class: 'request' },
      children: [
        {
          tag: 'div',
          uid: 'header',
          attr: { class: 'request__header' },
          children: [
            { tag: 'div', innerText: reqId, attr: { class: 'request__id' } },
            {
              tag: 'div',
              innerText: before.method,
              attr: { class: 'request__method' },
            },
            {
              tag: 'div',
              innerText: before.url,
              attr: { class: 'request__url' },
            },
          ],
        },
        { tag: 'div', uid: 'details', attr: { class: 'request__details' } },
      ],
    };

    const [reqDiv, nodes] = create_(skeleton);
    nodes.header.addEventListener('click', () => {
      nodes.details.classList.toggle('visible');
      showDetail(before, 'onBeforeRequest');
    });

    for (const event of REQ_EVENTS) {
      if (req.has(event)) {
        const requestDetail = req.get(event);
        const [detail] = create_({
          tag: 'div',
          attr: { class: `request__detail ${event}` },
          events: { click: () => showDetail(requestDetail, event) },
          children: [
            {
              tag: 'div',
              attr: { class: 'request__detail-event' },
              innerText: REQ_EVENTS_STR[event],
            },
            {
              tag: 'div',
              attr: { class: 'request__detail-timestamp' },
              innerText:
                event === 'onBeforeRequest'
                  ? new Date(requestDetail.timeStamp)
                      .toISOString()
                      .substring(0, 19)
                  : `+ ${requestDetail.timeStamp - before.timeStamp} ms`,
            },
          ],
        });
        nodes.details.appendChild(detail);
      }
    }

    list.appendChild(reqDiv);
  }
};

const handleCapturedRequestEvent = msg => {
  const req = msg.data;
  const reqId = req.requestId;
  if (state.requests.has(reqId)) {
    state.requests.get(reqId).set(msg.type, req);
  } else {
    const reqMap = new Map();
    reqMap.set(msg.type, req);
    state.requests.set(reqId, reqMap);
  }
  refreshList();
};

port.onMessage.addListener(msg => {
  console.debug('->dt', msg);

  if (REQ_EVENTS.includes(msg.type)) {
    handleCapturedRequestEvent(msg);
  }
});
console.debug('dtport', port, port.postMessage);

const post = messageSender(port, state.tabId);
post('welcome', 'hello');

listen(window, 'DOMContentLoaded', () => {
  listen('#capture-toggle', 'click', e => {
    const toggle = e.target.innerText;
    const start = toggle === 'Capture';

    const events = [];
    document.querySelectorAll('.req-event').forEach(rqEvt => {
      if (rqEvt.checked) {
        events.push(rqEvt.id);
      }
    });

    post('capture', {
      action: start ? 'start' : 'stop',
      blocking: checked('#blocking'),
      events,
    });

    e.target.innerText = toggle === 'Capture' ? 'Stop' : 'Capture';
    if (start) {
      e.target.classList.add('active');
    } else {
      e.target.classList.remove('active');
    }
  });

  listen('#clear-request-list', 'click', () => {
    state.requests.clear();
    refreshList();
  });
});
