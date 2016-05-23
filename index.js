var KEYS = {S: 83, X: 88, SLASH: 191}
var slashDown = false

var MINUTE = 60000
var HOUR = 3600000
var intervals = [
  MINUTE,
  2 * MINUTE,
  4 * MINUTE,
  8 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  4 * HOUR,
  8 * HOUR,
  12 * HOUR,
  24 * HOUR
]

var el = React.createElement.bind(React)
var root = document.createElement('div')
root.setAttribute('id', 'root')
document.body.appendChild(root)

var store
chrome.storage.sync.get('sentences', function(data) {
  var sentences = Array.isArray(data.sentences) && data.sentences.length > 0 ? data.sentences : []
  store = Redux.createStore(reducer, {items: sentences, visible: false})
  store.subscribe(render)
})

var render = () => {
  ReactDOM.render(
    el(VocabList, {
      handleClick: toggleList,
      items: store.getState().items,
      visible: store.getState().visible
    }),
    root
  ) 
}

var addItem = item => {
  store.dispatch({type: 'ADD_ITEM', item: item})
  chrome.storage.sync.set({sentences: store.getState().items})
}
var removeItem = index => {
  store.dispatch({type: 'REMOVE_ITEM', index})
  chrome.storage.sync.set({sentences: store.getState().items})
}
var toggleList = () => {
  store.dispatch({type: 'TOGGLE_LIST'})
}

var reducer = (state = {
  items: [],
  visible: true
}, action) => {
  console.log(action.type)
  switch (action.type) {
    case 'ADD_ITEM':
      return Object.assign({}, state, {
        items: [...state.items, action.item]
      })
    case 'TOGGLE_LIST':
      return Object.assign({}, state, {
        visible: !state.visible
      })
    case 'REMOVE_ITEM':
      return Object.assign({}, state, {
        items: [
          ...state.items.slice(0, action.index),
          ...state.items.slice(action.index + 1)
        ]
      })
    case 'DELETE_ALL':
      return Object.assign({}, state, {
        items: []
      })
    default:
      return state
  }
}

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
    el('span', {onClick: handleClick}, 'X'),
    items.map((item, i) => (
      el('li', {key: i},
        el('span', {}, item),
        el('span', {onClick: () => removeItem(i)}, 'X')
      )
    ))
  )
)

function popup(text) {
  $('<div>' + text + '</div>').css(popupStyle).appendTo('body').delay(100).fadeOut(2000)
}

addEventListener('keydown', function(e) {
  var selection = getSelection().toString()
  if (slashDown) {
    if (e.keyCode === KEYS.S && selection.length > 0) {
      chrome.storage.sync.get('sentences', function(data) {
        var sentences = Array.isArray(data.sentences) && data.sentences.length > 0 ? data.sentences : []
        chrome.storage.sync.set({sentences: JSON.stringify(sentences.concat(selection))}, function() {
          popup('Saved: ' + selection)
          addItem(selection)
        })
      })
    } else if (e.keyCode === KEYS.X) {
      toggleList()
    }
  } else if (e.keyCode === KEYS.SLASH) {
    slashDown = true
  }
})

addEventListener('keyup', function(e) {
  if (slashDown && e.keyCode === KEYS.SLASH) {
    slashDown = false
  }
})

console.log('sebu start!')

