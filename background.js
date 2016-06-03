var dictionary = (() => {
  var request = new XMLHttpRequest()

  // I really shouldn't be doing this synchronously...
  request.open('GET', 'data/dictionary.txt', false)
  request.send(null)

  // We're going to format the text into a hash-table so that we can look up
  // English translations by using Japanese words as keys.
  var lines = request.responseText.trim().split('\n').filter(line => line.length > 0)
  var dict = {}
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    var [japanese, pronunciation, ...translationSplit] = line.split(' ')
    dict[japanese] = (dict[japanese] || []).concat({pronunciation, translation: translationSplit.join(' ')})
  }
  return dict
})()

console.log('dictionary amount of entries: ' + Object.keys(dictionary).length)

var translate = text => {
  var translations = []
  for (var beginning = 0; beginning < text.length; beginning++) {
    for (var wordLength = 6; wordLength > 0; wordLength--) {
      var word = text.slice(beginning, beginning + wordLength)
      var wordInfo = wordEntrySearch(dictionary, word)
      if (wordInfo) {
        translations.push(formatWordEntry(wordInfo))
      }
    }
  }
  console.log('translations done')
  console.log(translations)
  return translations
}

var binarySearch = (dictionary, word) => {
  var lower = 0
  var upper = dictionary.length - 1

  while (lower <= upper) {
    var middle = lower + Math.floor((upper - lower) / 2)

    // Since the dictionary entries are formatted so that each line has the
    // word at the first part, where each part is separated by spaces, 
    // we can retrieve the word by just taking the first part of the split.
    var pivot = dictionary[middle].split(' ')[0]

    if (word < pivot) {
      upper = pivot - 1
    } else if (word > pivot) {
      lower = pivot + 1
    } else {
      return middle
    }
  }
  // If we don't find a match, we return null
  return null
}

var wordEntrySearch = (dictionary, word) => {
  var wordEntryIndex = binarySearch(dictionary, word)
  if (typeof wordEntryIndex === 'number') {
    return dictionary[wordIndex]
  } else {
    return null
  }
}

var formatWordEntry = wordEntry => {
  var [word, pronunciation, ...translationWords] = wordEntry.split(' ')
  return {
    word,
    pronunciation,
    translation: translationWords.join(' ')
  }
}

chrome.runtime.onMessage.addListener((request, sender, response) => {
  if (request.type === 'TRANSLATE') {
    chrome.tabs.query({active: true, currentWindow: true}, tabs => {
      chrome.tabs.sendMessage(tabs[0].id, translate(request.text), response => {
        console.log('response from translate')
        console.log(response)
      })
    })
  }
})
