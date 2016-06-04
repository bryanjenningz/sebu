var dictionary = (() => {
  var request = new XMLHttpRequest()

  // I really shouldn't be doing this synchronously...
  request.open('GET', 'data/dictionary.txt', false)
  request.send(null)

  // We're going to format the text into a hash-table so that we can look up
  // English translations by using Japanese words as keys.
  var lines = request.responseText.trim().split('\r\n').filter(line => line.length > 0)
  var dict = {}
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    var [japanese, ...translationSplit] = line.split(' ')
    dict[japanese] = (dict[japanese] || []).concat({translation: translationSplit.join(' ')})
  }
  return dict
})()

console.log('dictionary amount of entries: ' + Object.keys(dictionary).length)

var translate = text => {
  var translations = []
  var usedWords = {}
  for (var beginning = 0; beginning < text.length; beginning++) {
    var wordLength = Math.min(6, text.length - beginning)
    while (wordLength > 0) {
      var word = text.slice(beginning, beginning + wordLength)
      if (!usedWords[word]) {
        usedWords[word] = true
        var wordInfo =  dictionary[word]
        if (wordInfo) {
          var translation = Object.assign({}, {word})
          for (var i = 0; i < wordInfo.length; i++) {
            translation = Object.assign({}, translation, wordInfo[i])
          }
          console.log('translation')
          console.log(translation)
          translations.push(translation)
        }
      }
      wordLength -= 1
    }
  }
  return translations
}

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.type === 'translate') {
    console.log('translation requested...')
    console.log(request)
    console.log(sender)
    console.log(response)
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      var translation = translate(request.text)
      console.log('translation:')
      console.log(JSON.stringify(translation))
      chrome.tabs.sendMessage(tabs[0].id, translation, response => {
        console.log('response from translate')
        console.log(response)
      })
    })
  }
})
