import { messageSender } from '../utils/msg.js';
import { listen, checked, create, val } from '../utils/dom.js';
import { REQ_EVENTS, REQ_EVENTS_STR } from '../utils/req.js';

const port = browser.runtime.connect(undefined, { name: 'rqi-devtools' });

const state = {
  port,
  tabId: browser.devtools.inspectedWindow.tabId,
  requests: new Map(),
};

const switchView = viewId => {
  document.querySelectorAll('#content > .page').forEach(el => {
    const hiddenPresent = el.classList.contains('hidden');
    console.log(el);
    if (el.id === viewId && hiddenPresent) {
      el.classList.remove('hidden');
      console.log(el.classList);
    } else if (el.id !== viewId && !hiddenPresent) {
      el.classList.add('hidden');
      console.log(el.classList);
    }
  });
};

const showDetail = (detail, event) => {
  const target = document.getElementById('request');
  const url = new URL(detail.url);
  target.innerHTML = '';
  const [detailNode, detailNodes] = create({
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
    const [tr] = create({
      tag: 'tr',
      children: [
        { tag: 'td', innerText: name },
        { tag: 'td', innerText: value },
      ],
    });
    detailNodes.headers.appendChild(tr);
  }

  url.searchParams.forEach((v, k) => {
    const [tr] = create({
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
              innerText: before?.method ?? '???',
              attr: { class: 'request__method' },
            },
            {
              tag: 'div',
              innerText: before?.url ?? '???',
              attr: { class: 'request__url' },
            },
          ],
        },
        { tag: 'div', uid: 'details', attr: { class: 'request__details' } },
      ],
    };

    const [reqDiv, nodes] = create(skeleton);
    nodes.header.addEventListener('click', () => {
      nodes.details.classList.toggle('visible');
      showDetail(before, 'onBeforeRequest');
    });

    for (const event of REQ_EVENTS) {
      if (req.has(event)) {
        const requestDetail = req.get(event);
        const [detail] = create({
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

const createGraph = () => {
  const [cvs] = create({
    tag: 'canvas',
    attr: {
      id: 'graph',
      width: window.innerWidth*2,
      height: window.innerHeight - 50,
    },
    style: {
      border: '1px solid #333',
    },
  });

  const ctx = cvs.getContext('2d');
  ctx.fillStyle = '#282828';
  ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.font = '10px monospace';

  const flatEvents = new Map();
  const flatRequests = [];

  state.requests.forEach((events, requestId) => {
    const requestEvents = [];
    flatEvents.set(requestId, requestEvents);
    events.forEach((request, eventName) => {
      flatRequests.push(request);
      requestEvents.push(request);
    });
  });

  const timestamps = flatRequests.map(req => req.timeStamp);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);
  const span = maxTimestamp - minTimestamp;
  const gap = 30;

  ctx.lineWidth = 0.2;
  ctx.fillStyle = '#888';
  for (let x = 0; x < cvs.width; x += gap * 4) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cvs.height);
    ctx.stroke();
    ctx.fillText(
      `+${((span * x) / cvs.width).toFixed(0)} ms`,
      x,
      cvs.height - 10
    );
  }

  ctx.fillStyle = '#888';
  ctx.fillText(
    new Date(minTimestamp).toISOString().substring(0, 19).replace('T', ' '),
    10,
    cvs.height - 30
  );

  const normalizeX = x => {
    return ((x - minTimestamp) / span) * cvs.width;
  };

  console.log(minTimestamp, maxTimestamp);

  let i = 1;

  state.requests.forEach((events, requestId) => {
    const localTimestamps = flatEvents.get(requestId).map(req => req.timeStamp);
    const minLocal = Math.min(...localTimestamps);
    const maxLocal = Math.max(...localTimestamps);
    const localSpan = maxLocal - minLocal;

    const { method, url } = events.get('onBeforeRequest');
    const path = new URL(url).pathname;

    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(normalizeX(minLocal), i * gap);
    ctx.lineTo(normalizeX(maxLocal), i * gap);
    ctx.stroke();

    ctx.fillStyle = '#eee';
    ctx.fillText(
      `#${requestId} ${method} ${path.substring(0, 30)}${
        path.length > 30 ? '...' : ''
      }`,
      normalizeX(minLocal) + 5,
      i * gap - 5
    );

    events.forEach((event, eventName) => {
      const color = {
        onBeforeRequest: 'white',
        onBeforeSendHeaders: 'blue',
        onSendHeaders: 'cornflowerblue',
        onResponseStarted: 'lightgreen',
        onAuthRequired: 'orange',
        onBeforeRedirect: 'yellow',
        onHeadersReceived: 'green',
        onErrorOccurred: 'red',
        onCompleted: 'limegreen',
      }[eventName];
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(normalizeX(event.timeStamp), i * gap - 10);
      ctx.lineTo(normalizeX(event.timeStamp), i * gap + 10);
      ctx.stroke();
    });

    i += 1;
    if (gap * i >= cvs.height) {
      i = 1.5;
    }
  });

  document.getElementById('graph-page').innerHTML = '';
  document.getElementById('graph-page').appendChild(
    create({
      tag: 'button',
      innerText: 'render',
      events: { click: createGraph },
    })[0]
  );
  document.getElementById('graph-page').appendChild(cvs);

  post('debug', {
    flatEvents,
    flatRequests,
    timestamps,
    minTimestamp,
    maxTimestamp,
  });

  return cvs;
};

const resetGraph = () => {
  document.getElementById('graph-page').appendChild(
    create({
      tag: 'button',
      innerText: 'render',
      events: { click: createGraph },
    })[0]
  );
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
    switchView('main-page');
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
    switchView('main-page');
    state.requests.clear();
    resetGraph();
    refreshList();
  });
});

listen('#show-graph', 'click', () => {
  switchView('graph-page');
});

listen('#show-requests', 'click', () => {
  switchView('main-page');
});

listen('#show-interceptors', 'click', () => {
  switchView('interceptors-page');
});

listen('#render-btn', 'click', () => {
  createGraph();
});
