var KEYS = {P: 80, S: 83, X: 88, SLASH: 191}
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
var renderCalled = false

var el = React.createElement.bind(React)
var root = document.createElement('div')
root.setAttribute('id', 'root')
document.body.appendChild(root)

var store
chrome.storage.sync.get('state', function(data) {
  var state = data.state
  console.log(JSON.stringify(data))
  if (state) {
    var visibleList = state.visibleList || false
    var visibleRep = state.visibleRep || false
    var earliestTime = typeof state.earliestTime === 'number' ? state.earliestTime : 0
    var sentences = Array.isArray(state.sentences) && state.sentences.length > 0 ? state.sentences : []
    var initialState = {items: sentences, visibleList, visibleRep, earliestTime}
    initialize(initialState)
  } else {
    var initialState = {items: [], visibleList: false, visibleRep: false, earliestTime: 0}
    chrome.storage.sync.set({state: initialState}, () => {
      initialize(initialState)
    })
  }
})

var initialize = initialState => {
  store = Redux.createStore(reducer, initialState)
  store.subscribe(render)
  render()
  showRep()
  console.log('show rep loop started')
}

var render = () => {
  ReactDOM.render(el(App), root)

  // I'm just going to update chrome.storage every time we render
  // instead of using a Redux middleware function, to keep things simple.

  // If render hasn't been called, then that means that it is being called
  // with store.subscribe for the first time, and is therefore setting
  // the default store's state to the default values instead of the ones
  // stored in chrome.storage. To fix this, we're going going to update
  // chrome.storage after this initial call has happened.
  if (renderCalled) {
    chrome.storage.sync.set({state: store.getState()}, () => {
      console.log('updated chrome.storage!')
    })
  }
}

var nextTime = item => (
  item.lastSeen + intervals[item.interval]
)
var byNextTime = (a, b) => (
  nextTime(a) - nextTime(b)
)

var addItem = ({text, translations}) => {
  var item = {
    interval: 0,
    lastSeen: new Date().getTime(),
    text,
    translations
  }
  store.dispatch({type: 'ADD_ITEM', item})
  chrome.storage.sync.get('state', data => {
    var state = data.state
    chrome.storage.sync.set({state: Object.assign({}, state, {sentences: store.getState().items})}, () => {
      console.log('added new item to chrome.storage')
    })
  })
}
var deleteItem = index => {
  store.dispatch({type: 'DELETE_ITEM', index})
  chrome.storage.sync.get('state', data => {
    var state = data.state
    chrome.storage.sync.set({state: Object.assign({}, state, {sentences: store.getState().items})}, () => {
      console.log('added new item to chrome.storage')
    })
  })
}
var toggleList = () => {
  if (!store.getState().visibleRep &&
      (store.getState().visibleList || store.getState().items.length > 0)) {
    store.dispatch({type: 'TOGGLE_LIST'})
  }
}
var deleteAll = () => {
  if (store.getState().items.length > 0) {
    store.dispatch({type: 'DELETE_ALL'})
  }
}
var showRep = () => {
  console.log('checking rep...')
  if (!store.getState().visibleRep && !store.getState().visibleList &&
      store.getState().items.length > 0 &&
      nextTime(store.getState().items[0]) <= new Date().getTime() &&
      store.getState().earliestTime <= new Date().getTime()) {
    store.dispatch({type: 'SHOW_REP'})
  }
  var intervalTime = store.getState().earliestTime > new Date().getTime() ?
    store.getState().earliestTime - new Date().getTime() : 5000
  setTimeout(showRep, intervalTime)
}
var fail = () => {
  store.dispatch({type: 'FAIL', lastSeen: new Date().getTime()})
}
var pass = () => {
  store.dispatch({type: 'PASS', lastSeen: new Date().getTime()})
}
var postpone = () => {
  chrome.storage.sync.get('state', data => {
    var state = data.state
    state.earliestTime = new Date().getTime() + 5*MINUTE
    chrome.storage.sync.set({state}, () => {
      console.log('saved earliestTime')
    })
  })
  store.dispatch({type: 'POSTPONE', earliestTime: new Date().getTime() + 5*MINUTE})
}
var cancelPostpone = () => {
  store.dispatch({type: 'CANCEL_POSTPONE'})
  showRep()
}

var reducer = (state = {
  items: [],
  visibleList: false,
  visibleRep: false,
  earliestTime: 0
}, action) => {
  console.log(state)
  console.log(action.type)
  switch (action.type) {
    case 'ADD_ITEM':
      return Object.assign({}, state, {
        items: [...state.items, action.item].sort(byNextTime)
      })
    case 'TOGGLE_LIST':
      return Object.assign({}, state, {
        visibleList: !state.visibleList
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
        visibleRep: true
      })
    case 'FAIL':
      var failedItem = Object.assign({}, state.items[0], {
        interval: 0,
        lastSeen: action.lastSeen
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
        lastSeen: action.lastSeen
      })
      var otherItems = state.items.slice(1)
      return Object.assign({}, state, {
        items: [
          passedItem,
          ...otherItems
        ].sort(byNextTime),
        visibleRep: false
      })
    case 'POSTPONE':
      return Object.assign({}, state, {
        earliestTime: action.earliestTime,
        visibleRep: false
      })
    case 'CANCEL_POSTPONE':
      return Object.assign({}, state, {
        earliestTime: 0
      })
    default:
      return state
  }
}

var commonStyle = {
  'border': '5px solid black',
  'font': '18px Arial Black',
  'color': 'black',
}

var popupStyle = {
  'border': '5px solid black',
  'position': 'fixed',
  'display': 'block',
  'left': '30%',
  'top': '20%',
  'width': '40%',
  'background-color': '#FF0017',
  'padding': '10px',
  'font-size': '18px',
  'max-height': '300px',
  'overflow-y': 'auto',
  'zIndex': '9999',
}

var listStyle = {
  'max-height': '200px',
  'overflow-y': 'auto',
  'padding': '15px',
  'margin-bottom': '10px',
  'background-color': 'white',
  'border': '5px solid black',
}

buttonStyle = {
  'width': '50%',
  'height': '40px',
  'border': 'none',
  'position': 'relative',
  'color': 'white',
  'font-size': '16px',
  'background-color': '#0042FF',
  'border': '5px solid black',
}

var VocabList = ({
  handleClick,
  items,
  visibleList
}) => (
  el('div', {style: Object.assign({}, popupStyle, {display: visibleList ? 'block' : 'none'})},
    el('div', {style: {position: 'relative'}},
      el('button', {onClick: handleClick, style: buttonStyle},
        'Close'
      ),
      el('button', {onClick: deleteAll, style: buttonStyle},
        'Delete All'
      ),
      el('div', {style: {'background-color': 'white', padding: '5px'}},
        items.map((item, i) => (
          el('div', {key: i, style: {position: 'relative', 'font-size': '12px'}},
            el('div', {}, el('span', {style: {'fontWeight': 800}}, item.text), ':\n',
              item.translations.map(translation => (
                el('div', {}, el('span', {style: {'fontWeight': 800}}, translation.word), ':', translation.translation)
              ))
            ),
            el('button', {onClick: () => deleteItem(i), style: Object.assign({}, buttonStyle, {position: 'absolute', right: 0, top: 0, 'text-align': 'center', width: '25px', height: '25px'})},
              'X'
            )
          )
        ))
      )
    )
  )
)

var VocabRep = ({
  items,
  visibleRep
}) => (
  el('div', {style: Object.assign({}, commonStyle, popupStyle, {display: visibleRep ? 'block' : 'none'})},
    el('div', {style: listStyle}, items.length ? items[0].text : ''),
    el('div', {},
      el('button', {onClick: fail, style: buttonStyle},
        'Fail'
      ),
      el('button', {onClick: pass, style: buttonStyle},
        'Pass'
      ),
      el('button', {onClick: postpone, style: Object.assign({}, buttonStyle, {'background-color': '#007740', 'width': '100%'})},
        'Postpone'
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
        console.log(sentences)
        console.log(selection)
        chrome.runtime.sendMessage({type: 'translate', text: selection}, function(response) {
          chrome.storage.sync.set({sentences: JSON.stringify(sentences.concat(selection))}, function() {
            popup('Saved: ' + selection)
            console.log('response')
            console.log(response)
            // addItem({text: selection, translations: response})
          })
        })
      })
    } else if (e.keyCode === KEYS.X) {
      toggleList()
    } else if (e.keyCode === KEYS.P) {
      cancelPostpone()
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('received a message!!!!!')
  console.log(request)
  addItem({text: getSelection().toString(), translations: request})
})
