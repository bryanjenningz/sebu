var KEYS = {S: 83, L: 76};
var popupStyle = {
  position: 'fixed',
  display: 'block',
  left: '30%',
  top: '20%',
  width: '40%',
  'background-color': '#1EB5B5',
  padding: '30px',
  'font-size': '16px',
  'max-height': '300px',
  'overflow-y': 'auto'
};

function popup(text) {
  $('<div>' + text + '</div>').css(popupStyle).appendTo('body').delay(100).fadeOut(2000);
}

function popupList(texts) {
  var htmlString = '<div>';
  for (var i = 0; i < texts.length; i++) {
    htmlString += '<li>' + texts[i] + '</li>';
  }
  htmlString += '</div>';
  $(htmlString)
    .css(popupStyle)
    .appendTo('body')
    .click(function() {
      $(this).remove();
    });
}

addEventListener('keydown', function(e) {
  var selection = getSelection().toString();
  if (e.keyCode === KEYS.S && selection.length > 0) {
    chrome.storage.sync.get('sentences', function(data) {
      var sentences = Object.keys(JSON.parse(data.sentences)).length > 0 ? JSON.parse(data.sentences) : [];
      chrome.storage.sync.set({sentences: JSON.stringify(sentences.concat(selection))}, function() {
        console.log('sentences before: ' + sentences);
        console.log('saved: "' + selection + '"');
        popup('Saved: ' + selection);
      });
    });
  } else if (e.keyCode === KEYS.L) {
    chrome.storage.sync.get('sentences', function(data) {
      if (Object.keys(data.sentences).length > 0) {
        console.log('pressed L');
        popupList(JSON.parse(data.sentences));
      }
    });
  }
});

console.log('sebu start!');
