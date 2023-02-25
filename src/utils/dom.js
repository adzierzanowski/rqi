export const resolveElement = elOrSelector => {
  let el = elOrSelector;

  if (typeof elOrSelector === 'string') {
    el = document.querySelector(elOrSelector);
  }

  if (!el) {
    console.error(`Element ${elOrSelector} does not exist.`);
  }

  return el;
};

export const listen = (elOrSelector, event, callback) => {
  const el = resolveElement(elOrSelector);
  el?.addEventListener(event, callback);
};

export const checked = elOrSelector => {
  const el = resolveElement(elOrSelector);
  return el?.checked;
};

export const val = elOrSelector => {
  const el = resolveElement(elOrSelector);
  return el?.value;
};

export const create = query => {
  const spec = query.split(' ').reverse();

  const el = document.createElement(spec.pop());

  while (spec.length > 0) {
    const s = spec.pop();
    if (s[0] === '#') {
      el.setAttribute('id', s.substring(1));
    } else if (s[0] === '.') {
      el.classList.add(s.substring(1));
    }
  }

  return el;
};

export const create_ = spec => {
  const root = document.createElement(spec.tag);
  let uids = {};
  for (const attr in spec.attr) {
    root.setAttribute(attr, spec.attr[attr]);
  }
  if (spec.innerText) {
    root.appendChild(document.createTextNode(spec.innerText));
  }
  if (spec.innerHTML) {
    const inner = document.createElement('span');
    inner.innerHTML = spec.innerHTML;
    root.appendChild(inner);
  }
  if (spec.events) {
    for (const event in spec.events) {
      root.addEventListener(event, spec.events[event]);
    }
  }
  if (spec.style) {
    for (const key in spec.style) {
      root.style[key] = spec.style[key];
    }
  }
  if (spec.children) {
    for (const childSpec of spec.children) {
      const [child, childUids] = create_(childSpec);
      uids = { ...uids, ...childUids };
      root.appendChild(child);
    }
  }
  if (spec.uid) {
    uids[spec.uid] = root;
  }
  return [root, uids];
};
