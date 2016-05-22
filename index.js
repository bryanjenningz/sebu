var KEYS = {S: 83, L: 76, X: 88}
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
      handleClick: () => store.dispatch({type: 'TOGGLE_LIST'}),
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
    el('span', {onClick: () => store.dispatch({type: 'TOGGLE_LIST'})}, 'X'),
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
      var sentences = Array.isArray(data.sentences) && data.sentences.length > 0 ? data.sentences : []
      chrome.storage.sync.set({sentences: JSON.stringify(sentences.concat(selection))}, function() {
        popup('Saved: ' + selection)
        addItem(selection)
      })
    })
  } else if (e.keyCode === KEYS.L) {
    chrome.storage.sync.get('sentences', function(data) {
      if (Array.isArray(data.sentences) && data.sentences.length > 0) {
        popupList(data.sentences)
      }
    })
  } else if (e.keyCode === KEYS.X) {
    store.dispatch({type: 'TOGGLE_LIST'})
  }
})



console.log('sebu start!')
