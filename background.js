chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    bounds: {
      width: 960,
      height: 500,
      left: 100,
      top: 100
    }
  });
});

chrome.runtime.onSuspend.addListener(function() { 
  // Do some simple clean-up tasks.
});

chrome.runtime.onInstalled.addListener(function() { 
  // chrome.storage.local.set(object items, function callback);
});
