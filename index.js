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
  store = Redux.createStore(reducer, {items: sentences, visibleList: false, visibleRep: false})
  store.subscribe(render)
  render()
  showRep()
  console.log('show rep loop started')
})

var render = () => {
  ReactDOM.render(el(App), root) 
}

var nextTime = item => (
  item.time + intervals[item.interval]
)
var byNextTime = (a, b) => (
  nextTime(a) - nextTime(b)
)

var addItem = text => {
  var item = {
    interval: 0,
    text,
    time: new Date().getTime(),
  }
  store.dispatch({type: 'ADD_ITEM', item})
  chrome.storage.sync.set({sentences: store.getState().items})
}
var deleteItem = index => {
  store.dispatch({type: 'DELETE_ITEM', index})
  chrome.storage.sync.set({sentences: store.getState().items})
}
var toggleList = () => {
  store.dispatch({type: 'TOGGLE_LIST'})
}
var deleteAll = () => {
  store.dispatch({type: 'DELETE_ALL'})
}
var showRep = () => {
  console.log('checking rep...')
  if (!store.getState().visibleRep && !store.getState().visibleList &&
      nextTime(store.getState().items[0]) <= new Date().getTime()) {
    store.dispatch({type: 'SHOW_REP'})
  }
  setTimeout(showRep, 5000)
}
var fail = () => {
  store.dispatch({type: 'FAIL', time: new Date().getTime()})
}
var pass = () => {
  store.dispatch({type: 'PASS', time: new Date().getTime()})
}

var reducer = (state = {
  items: [],
  visibleList: false,
  visibleRep: false
}, action) => {
  console.log(action.type)
  switch (action.type) {
    case 'ADD_ITEM':
      return Object.assign({}, state, {
        items: [...state.items, action.item].sort(byNextTime)
      })
    case 'TOGGLE_LIST':
      return Object.assign({}, state, {
        visibleList: state.visibleRep ? false : !state.visibleList
      })
    case 'DELETE_ITEM':
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
    case 'SHOW_REP':
      return Object.assign({}, state, {
        visibleRep: !state.visibleList
      })
    case 'FAIL':
      var failedItem = Object.assign({}, state.items[0], {
        interval: 0,
        time: action.time
      })
      var otherItems = state.items.slice(1)
      return Object.assign({}, state, {
        items: [
          failedItem,
          ...otherItems
        ].sort(byNextTime),
        visibleRep: false
      })
    case 'PASS':
      var passedItem = Object.assign({}, state.items[0], {
        interval: Math.min(state.items[0].interval + 1, intervals.length - 1),
        time: action.time
      })
      var otherItems = state.items.slice(1)
      return Object.assign({}, state, {
        items: [
          passedItem,
          ...otherItems
        ].sort(byNextTime),
        visibleRep: false
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
  'overflow-y': 'auto',
  zIndex: 9999
}

var VocabList = ({
  handleClick,
  items,
  visibleList
}) => (
  el('div', {style: Object.assign({}, popupStyle, {display: visibleList ? 'block' : 'none'})},
    el('button', {onClick: handleClick}, 'Close'),
    el('button', {onClick: deleteAll}, 'Delete All'),
    items.map((item, i) => (
      el('li', {key: i},
        el('span', {}, item.text),
        el('span', {onClick: () => deleteItem(i)}, 'X')
      )
    ))
  )
)

var VocabRep = ({
  items,
  visibleRep
}) => (
  el('div', {style: Object.assign({}, popupStyle, {display: visibleRep ? 'block' : 'none'})},
    el('div', {}, items[0].text),
    el('div', {},
      el('div', {},
        el('button', {onClick: fail},
          'Fail'
        )
      ),
      el('div', {},
        el('button', {onClick: pass},
          'Pass'
        )
      )
    )
  )
)

var App = () => (
  el('div', {}, 
    el(VocabRep, {
      items: store.getState().items,
      visibleRep: store.getState().visibleRep
    }),
    el(VocabList, {
      handleClick: toggleList,
      items: store.getState().items,
      visibleList: store.getState().visibleList
    }) 
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

