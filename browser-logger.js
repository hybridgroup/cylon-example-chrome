var Logger = module.exports = {
  log: function(args) {
    args = args.length >= 1 ? [].slice.call(args, 0) : [];

    var container = document.getElementById('log'),
        div = document.createElement("div"),
        text = document.createTextNode(args.join(''));

    div.appendChild(text);
    container.appendChild(div);
  }
};

['debug', 'info', 'warn', 'error', 'fatal'].forEach(function(type) {
  Logger[type] = Logger.log;
});
