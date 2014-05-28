// dependencies
var childProcess = require('child_process')
var http         = require('http')
var phantomjs    = require('phantomjs')

var server       = http.createServer()
var binPath      = phantomjs.path


// functions
var staticPage = function (title) {
  return '<html>' +
            '<head></head>' +
            '<body style="background-color: #ffffff">' +
              '<h1>' + title + '</h1>' +
            '</body>' +
          '</html>'
}

var runClyde = function (callback) {
  console.log('Beginning to run Clyde...')
  var args = [
    // CLI flags to be run with clyde script (USE ONLY FOR DEV ENVIRONMENT)
    process.env.NODE_ENV === 'development' ? '--ignore-ssl-errors=true' : '',
    process.env.NODE_ENV === 'development' ? '--ssl-protocol=any' : '',

    // path to clyde script
    '../clyde.js',

    // arguments passed to clyde script
    'domain=http://localhost:3000',
    'targetDirectory=snapshots',
    'linkTarget=',
    'viewport=360x480'
  ]

  childProcess.execFile(binPath, args, function (err, stdout, stderr) {
    console.log(stdout)
    if (callback && 'function' === typeof callback) {
      callback()
    }
  })
}


// server config and start
server
.on('request', function (req, res) {
  var path = req.url

  switch (path) {
    case '/':
      res.end('<html>' +
                '<head></head>' +
                '<body style="background-color: #ffffff">' +
                  '<h1>Home</h1>' +
                  '<ul>'+
                    '<li><a href="/foo">Foo</a></li>' +
                    '<li><a href="/bar">Bar</a></li>' +
                    '<li><a href="/baz">Baz</a></li>' +
                  '</ul>' +
                '</body>' +
              '</html>')
      break
    case '/foo':
      res.end(staticPage('Foo'))
      break
    case '/bar':
      res.end(staticPage('Bar'))
      break
    case '/baz':
      res.end(staticPage('Baz'))
      break
    default:
      res.end(staticPage('404'))
  }
})
.listen(3000, function () {
  console.log('server started')

  runClyde(function () {
    console.log('Clyde has completed!')
  })
})
