var KEYS = {S: 83, L: 76, X: 88}
var el = React.createElement.bind(React)
var root = document.createElement('div')
root.setAttribute('id', 'root')
document.body.appendChild(root)


function render() {
  console.log('rendered')
  ReactDOM.render(
    el(VocabList, {
      handleClick: () => store.dispatch({type: 'HIDE_LIST'}),
      items: store.getState().items,
      visible: store.getState().visible
    }), root)
}

var reducer = (state = {
  items: ['hey', 'hello', 'hi'],
  visible: true
}, action) => {
  console.log(action.type)
  switch (action.type) {
    case 'SHOW_LIST':
      return Object.assign({}, state, {
        visible: true
      })
    case 'HIDE_LIST':
      return Object.assign({}, state, {
        visible: false
      })
    default:
      return state
  }
}

var store = Redux.createStore(reducer)
store.subscribe(render)

var popupStyle = {
  position: 'fixed',
  display: 'block',
  left: '30%',
  top: '20%',
  width: '40%',
  'background-color': '#67CFEC',
  padding: '30px',
  'font-size': '16px',
  'max-height': '300px',
  'overflow-y': 'auto'
}

var VocabList = ({
  handleClick,
  items,
  visible
}) => (
  el('div', {style: Object.assign({}, popupStyle, {display: visible ? 'block' : 'none'})},
    items.map((item, i) => (
      el('li', {key: i, onClick: handleClick}, item)
    ))
  )
)

function popup(text) {
  $('<div>' + text + '</div>').css(popupStyle).appendTo('body').delay(100).fadeOut(2000)
}

function popupList(texts) {
  var htmlString = '<div>'
  for (var i = 0; i < texts.length; i++) {
    htmlString += '<li>' + texts[i] + '</li>'
  }
  htmlString += '</div>'
  $(htmlString)
    .css(popupStyle)
    .appendTo('body')
    .click(function() {
      $(this).remove()
    })
}

addEventListener('keydown', function(e) {
  var selection = getSelection().toString()
  if (e.keyCode === KEYS.S && selection.length > 0) {
    chrome.storage.sync.get('sentences', function(data) {
      var sentences = Object.keys(JSON.parse(data.sentences)).length > 0 ? JSON.parse(data.sentences) : []
      chrome.storage.sync.set({sentences: JSON.stringify(sentences.concat(selection))}, function() {
        console.log('sentences before: ' + sentences)
        console.log('saved: "' + selection + '"')
        popup('Saved: ' + selection)
      })
    })
  } else if (e.keyCode === KEYS.L) {
    chrome.storage.sync.get('sentences', function(data) {
      if (Object.keys(data.sentences).length > 0) {
        console.log('pressed L')
        popupList(JSON.parse(data.sentences))
      }
    })
  } else if (e.keyCode === KEYS.X) {
    store.dispatch({type: 'SHOW_LIST'})
    console.log('show list')
  }
})



console.log('sebu start!')
