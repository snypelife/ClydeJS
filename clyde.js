// Variables
// ---------

// Phantom.js dependencies
var system       = require('system')
var fs           = require('fs')
var webPage      = require('webpage')

// reusable page object
var page

// target domain
var settings     = {}
var args         = system.args.forEach(function (item) { var arg = item.split('='); settings[arg[0]] = arg[1]; })
var domain       = settings['domain'] || 'https://localhost:3000'
var subDir       = settings['subDirectory'] || ''
var targetDir    = settings['targetDirectory'] || 'snapshots'
var linkTarget   = settings['linkTarget'] || ''
var logDirectory = settings['logDirectory'] || 'logs'
var viewport     = settings['viewport'] ? settings['viewport'].split('x') : [1200, 800]

// initial start time for timer
var timerStart   = Date.now()

// arrays used to cross reference progress and avoid duplication
var archive      = []
var urlsToOpen   = []

// Functions
// ---------

// simple log to file function
var writeToLogFile = function (filename, content) {
  var path = logDirectory
  path     = /^\//.test(path) ? path : '/' + path
  path     = /\/$/.test(path) ? path : path + '/'
  path     = fs.workingDirectory + path + filename

  if (fs.exists(path)) {
    var logData = fs.read(path)
    fs.write(path, logData + '\n' + content, 'w')
  }
  else {
    fs.write(path, content, 'w')
  }
}

// simple file creator and recursive directory builder function
var newFile = function (path, content, callback) {
  path = /^\//.test(path) ? path : '/' + path
  path = /\/$/.test(path) ? path : path + '/'

  if (!fs.exists(fs.workingDirectory + path)) {
    fs.makeTree(fs.workingDirectory + path)
    newFile(path, content, callback)
  }
  else {
    fs.write(fs.workingDirectory + path + 'index.html', content, 'w')
    page.render(fs.workingDirectory + path + 'index.jpg')
    callback()
  }
}

var onFileCreated = function (links) {
  page.close()

  urlsToOpen = urlsToOpen.concat(links).filter(function (value, index, self) {
    return self.indexOf(value) === index
  })

  var next = urlsToOpen.pop()

  while (archive.indexOf(domain + subDir + (/^\//.test(next) ? next : '/' + next)) !== -1 || /[^https:\/\/].*(\/\/).*$/.test(next)) {
    next = urlsToOpen.pop()
  }

  if (!urlsToOpen.length && !next) {
    onCrawlComplete()
  }
  else {
    openPage(domain + subDir + (/^\//.test(next) ? next : '/' + next))
  }
}

var onPageFailure = function () {
  var timestamp = new Date()
  var message   = 'Page open of ' + page.url + ' failed, stopping crawl... - timestamp: ' + timestamp.toString()
  console.log(message)
  writeToLogFile('clyde-error.log', message)
  phantom.exit()
}

var onPageSuccess = function () {
  var result = page.evaluate(function (linkTarget) {
    // simple logic that gathers all links on the page
    var links = Array.prototype.map.call(document.querySelectorAll(linkTarget ? 'a[href^="' + linkTarget + '"]' : 'a'), function (e) {
      return e.getAttribute('href')
    })
    Array.prototype.slice.call(document.querySelectorAll('script')).forEach(function(s) {
      s.parentNode.removeChild(s)
    })
    var content = document.querySelectorAll('html')[0].outerHTML
    return [content, links]
  }, linkTarget)

  var pageURL = page.url
  archive.push(pageURL)

  var html  = result[0]
  var links = result[1]
  var dir   = pageURL.replace(domain, targetDir).replace(linkTarget, '')

  newFile(dir, html, function () {
    onFileCreated(links)
  })
}

// workhorse function
var onPageLoaded = function (status) {
  if (status !== 'success') {
    onPageFailure()
  } else {
    onPageSuccess()
  }
}

var onCrawlComplete = function () {
  var timestamp = new Date()
  var time      = ((+timestamp - timerStart) / 1000)
  var hours     = parseInt(time / 3600 % 24, 10)
  var minutes   = parseInt(time / 60 % 60, 10)
  var seconds   = parseInt(time % 60, 10)
  var result    = (hours < 10 ? '0' + hours : hours) + 'h : ' + (minutes < 10 ? '0' + minutes : minutes) + 'm : ' + (seconds  < 10 ? '0' + seconds : seconds) + 's'
  var message   = 'Snapshots created: ' + archive.length + '\nTotal time elapsed: ' + result + '\nTimestamp: ' + timestamp.toString()

  console.log(message)
  writeToLogFile('clyde-stdout.log', message)
  phantom.exit()
}

// basic page opener function
var openPage = function (path) {
  page = webPage.create()
  page.settings.userAgent = 'Clyde (Phantom.js)'
  page.viewportSize = {
    width: viewport[0],
    height: viewport[1]
  }

  page.onError = function (msg, trace) {
    var msgStack = ['ERROR: ' + msg + ' ']
    if (trace && trace.length) {
      msgStack.push('TRACE: ')
      trace.forEach(function(t) {
        msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? '(in function "' + t.function +'")' : ''))
      })
    }
    writeToLogFile('clyde-error.log', msgStack.join('\n'))
    console.error(msgStack.join('\n'))
    phantom.exit()
  }

  page.open(path, onPageLoaded)
}

// Start
// -----
openPage(domain + subDir)
