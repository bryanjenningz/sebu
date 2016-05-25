var dictionary = (() => {
  var request = new XMLHttpRequest()
  request.open('GET', 'data/dictionary.txt', false)
  request.send(null)
  return request.responseText
})()
