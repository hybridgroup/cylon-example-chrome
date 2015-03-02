module.exports = function(element) {
  function logHTML(arr) {
    var div = document.createElement("div"),
        text = document.createTextNode(arr.join(""));

    div.appendChild(text);
    element.appendChild(div);
  }

  var Logger = {
    log: function() {
      var args = [].slice.call(arguments, 0);
      logHTML(args);
    }
  };

  ['debug', 'info', 'warn', 'error', 'fatal'].forEach(function(type) {
    Logger[type] = Logger.log;
  });

  return Logger;
};
