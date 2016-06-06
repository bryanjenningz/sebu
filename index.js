var KEYS = {D: 68, P: 80, S: 83, X: 88, SLASH: 191}
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
chrome.storage.sync.get('state', data => {
  var state = data.state
  if (state) {
    var visibleList = state.visibleList || false
    var visibleRep = state.visibleRep || false
    var earliestTime = typeof state.earliestTime === 'number' ? state.earliestTime : 0
    var items = Array.isArray(state.items) && state.items.length > 0 ? state.items : []
    var initialState = {items, visibleList, visibleRep, earliestTime, visibleAddSmallItemDisplay: false}
    initialize(initialState)
  } else {
    var initialState = {items: [], visibleList: false, visibleRep: false, earliestTime: 0}
    chrome.storage.sync.set({state: initialState}, () => {
      initialize(initialState)
    })
  }
})

var updateChromeStorageMiddleware = store => next => action => {
  console.log('dispatching: ' + JSON.stringify(action))
  var result = next(action)
  console.log('state: ' + JSON.stringify(store && store.getState()))
  chrome.storage.sync.set({state: store.getState()}, () => {
    console.log('chrome storage updated')
  })
  return result
}

var initialize = initialState => {
  store = Redux.createStore(reducer, initialState, Redux.applyMiddleware(updateChromeStorageMiddleware))
  store.subscribe(render)
  render()
  showRep()
}

var render = () => {
  ReactDOM.render(el(App), root)
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
}
var displayAddSmallItem = ({itemIndex}) => {
  store.dispatch({type: 'DISPLAY_ADD_SMALL_ITEM', itemIndex})
}
var closeAddSmallItem = () => {
  store.dispatch({type: 'CLOSE_ADD_SMALL_ITEM'})
}
var addSmallItem = ({itemIndex, text}) => {
  store.dispatch({type: 'ADD_SMALL_ITEM', text, itemIndex})
}
var deleteItem = index => {
  store.dispatch({type: 'DELETE_ITEM', index})
}
var deleteSmallItem = ({itemIndex, smallItemIndex}) => {
  store.dispatch({type: 'DELETE_SMALL_ITEM', itemIndex, smallItemIndex})
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
  visibleAddSmallItemDisplay: false,
  earliestTime: 0
}, action) => {
  switch (action.type) {
    case 'ADD_ITEM':
      return Object.assign({}, state, {
        items: [...state.items, action.item].sort(byNextTime)
      })
    case 'DISPLAY_ADD_SMALL_ITEM':
      return Object.assign({}, state, {
        visibleAddSmallItemDisplay: action.itemIndex
      })
    case 'CLOSE_ADD_SMALL_ITEM':
      return Object.assign({}, state, {
        visibleAddSmallItemDisplay: false
      })
    case 'ADD_SMALL_ITEM':
      return  Object.assign({}, state, {
        items: [
          ...state.items.slice(0, action.itemIndex),
          Object.assign({}, state.items[action.itemIndex], {
            translations: [
              {word: 'Note', translation: action.text},
              ...state.items[action.itemIndex].translations
            ]
          }),
          ...state.items.slice(action.itemIndex + 1)
        ],
        visibleAddSmallItemDisplay: false
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
    case 'DELETE_SMALL_ITEM':
      return Object.assign({}, state, {
        items: [
          ...state.items.slice(0, action.itemIndex),
          Object.assign({}, state.items[action.itemIndex], {
            translations: [
              ...state.items[action.itemIndex].translations.slice(0, action.smallItemIndex),
              ...state.items[action.itemIndex].translations.slice(action.smallItemIndex + 1)
            ]
          }),
          ...state.items.slice(action.itemIndex + 1)
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
  'background-color': '#020066',
  'padding': '10px',
  'font-size': '18px',
  'max-height': '400px',
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
              item.translations.map((smallItem, j) => (
                el('div', {style: {position: 'relative'}}, el('span', {style: {'fontWeight': 800}}, smallItem.word), ':',
                  el('div', {}, smallItem.translation,
                    el('button', {onClick: () => deleteSmallItem({itemIndex: i, smallItemIndex: j}), style: Object.assign({}, buttonStyle, {
                        position: 'absolute', right: 0, top: '6px', 'text-align': 'center', width: '14px', height: '15px', border: '2px solid black', 'font-size': '12px', 'line-height': '11px'
                      })},
                      'x'
                    )
                  )
                )
              ))
            ),
            el('button', {onClick: () => displayAddSmallItem({itemIndex: i}), style: Object.assign({}, buttonStyle, {position: 'absolute', right: '25px', top: 0, 'text-align': 'center', width: '25px', height: '25px', 'font-size': '23px', 'line-height': '10px'})},
              '+'
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
}) => {
  return el('div', {style: Object.assign({}, commonStyle, popupStyle, {display: visibleRep ? 'block' : 'none'})},
    el('div', {style: Object.assign({}, listStyle, {'fontWeight': 900})}, items.length ? items[0].text : ''),
    el('div', {style: listStyle}, items.length ? (
      el('div', {},
        items[0].translations.map(t => (
          el('div', {style: {'font-size': '12px', 'fontWeight': 900}},
            el('span', {}, t.word + ': ' + t.translation)
          )
        ))
      )
    ) : ''),  
    el('div', {},
      el('button', {onClick: fail, style: buttonStyle},
        'Fail'
      ),
      el('button', {onClick: pass, style: buttonStyle},
        'Pass'
      ),
      el('button', {onClick: postpone, style: Object.assign({}, buttonStyle, {'background-color': '#191a34', 'width': '100%'})},
        'Postpone'
      )
    )
  )
}

var AddSmallItemDisplay = ({itemIndex}) => {
  return el('div', {style: popupStyle},
    el('textarea', {style: {width: '96%', height: '50px'}, ref: node => {this.textarea = node}}),
    el('button', {style: buttonStyle, onClick: closeAddSmallItem}, 'Close'),
    el('button', {style: buttonStyle, onClick: (e) => {
      var text = e.target.parentElement.children[0].value
      addSmallItem({itemIndex, text})
    }}, 'Add Note')
  )
}

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
    }),
    typeof store.getState().visibleAddSmallItemDisplay === 'number' ? el(AddSmallItemDisplay, {itemIndex: store.getState().visibleAddSmallItemDisplay}) : ''
  )
)

function showAddItemMessage(text) {
  $('<div>' + text + '</div>')
    .css(Object.assign({}, popupStyle, {color: 'white', top: '5%'}))
    .appendTo('body')
    .delay(100)
    .fadeOut(2000)
}

function downloadCsv() {
  var text = 'data:text/csv;charset=utf-8,' +
    store.getState().items.map(item => {
      return [
        item.text,
        item.translations.map(t => {
          return t.word.replace(/,/g, ';') + ': ' +
            t.translation.replace(/,/g, ';')
        }).join(';')
      ].join('\t')
    }).join('\r\n')
  var encodedUri = encodeURI(text)
  var link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', 'sebu_data.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
}

addEventListener('keydown', e => {
  var selection = getSelection().toString()
  if (slashDown) {
    if (e.keyCode === KEYS.S && selection.length > 0) {
      chrome.storage.sync.get('sentences', data => {
        var sentences = Array.isArray(data.sentences) && data.sentences.length > 0 ? data.sentences : []
        chrome.runtime.sendMessage({type: 'translate', text: selection}, response => {
          showAddItemMessage('Saved: ' + selection)
        })
      })
    } else if (e.keyCode === KEYS.X) {
      toggleList()
    } else if (e.keyCode === KEYS.P) {
      cancelPostpone()
    } else if (e.keyCode === KEYS.D) {
      downloadCsv()
    }
  } else if (e.keyCode === KEYS.SLASH) {
    slashDown = true
  }
})

addEventListener('keyup', e => {
  if (slashDown && e.keyCode === KEYS.SLASH) {
    slashDown = false
  }
})

console.log('sebu start!')

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  addItem({text: getSelection().toString(), translations: request})
})
