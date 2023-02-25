export const messageSender = (port, tabId) => {
  const wrapper = (type, data) => {
    port.postMessage({
      type,
      tabId,
      data,
    });
  };
  return wrapper;
};

export const bgMessageSender = port => {
  const wrapper = (type, data) => {
    port.postMessage({
      type,
      data,
    });
  };
  return wrapper;
};
