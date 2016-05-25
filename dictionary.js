var dictionary = (() => {
  var request = new XMLHttpRequest()
  request.open('GET', 'data/dictionary.dat', false)
  request.send(null)
  return request.responseText
})()
