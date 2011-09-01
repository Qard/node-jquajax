/**
 * node-jquajax
 * 
 * Provides the functionality of jQuery.ajax
 * without needing to use jQuery in jsdom.
 * 
 * (c) 2011 Stephen Belanger
 * Licensed as MIT.
 */
var http = require('http');
var https = require('https');
var qstring = require('querystring');
var url = require('url');

// DRY up $.get and $.post
var helper = function(type){
  return function(url, data, success, dataType){
    $.ajax({
      url: url,
      data: data,
      success: success,
      dataType: dataType,
      method: type.toUpperCase()
    });
  };
};

// Mock jQuery object.
$ = {
  /**
   * Partial implementation.
   * Includes;
   *    - url
   *    - data
   *    - dataType ("text" and "json" only)
   *    - method
   *    - headers
   *    - contentType
   *    - statusCode
   *    - error
   *    - success
   */
  ajax: function(url, settings) {
    // Shift settings if url not supplied as first argument.
    if ( ! settings) {
      settings = url
      url = settings.url
    }

    // Ensure URL is present, and complete.
    if ( ! url) { url = 'http://localhost/' }
    if (url[0] !== '/') { url = '/' + url }
    if ( ! url.match(/:\/\//)) { url = 'http://localhost' + url; }

    // Parse URL string. Retain query items.
    var urlParts = url.parse(url, true);
    if (typeof urlParts.query === 'object') {
      settings.data = _.extend(urlParts.query, settings.data);
    }

    // Determine protocol.
    var protocol = url.match(/^https/) ? 'https' : 'http';
    
    // Construct options hash.
    var options = {
      host: urlParts.hostname,
      port: urlParts.port || (protocol === 'https' ? 443 : 80),
      path: urlParts.pathname || '/',
      method: (settings.method || 'GET').toUpperCase()
    };

    // Add headers, if present.
    options.headers = settings.headers || {};

    // Add content-type, if present.
    options.headers['Content-Type'] = settings.contentType || 'application/x-www-form-urlencoded'

    // Create client.
    var client = protocol === 'https' ? https : http;
    var req = client.request(options, function(res) {
      res.setEncoding('utf8');
      var chunks = [];

      // Run statusCode callbacks, if available.
      if (settings.statusCode){
        if (typeof settings.statusCode[res.statusCode] === 'function') {
          settings.statusCode[res.statusCode]();
        }
      }

      // Collect chunks and merge.
      res.on('data', function (chunk) { chunks.push(chunk); });
      res.on('end', function(){
        var data = chunks.join('');

        // Parse JSON, if we are expecting it.
        if (settings.dataType === 'json') { data = JSON.parse(data); }

        // Call success callback.
        if (typeof settings.success === 'function') { settings.success(data); }
      });
    });

    // Run the error callback, if it exists.
    if (typeof settings.error === 'function') {
      req.on('error', function(e) {
        settings.error(null, e.message, e)
      });
    }

    // We have data to send.
    if (typeof settings.data !== 'undefined') {
      if (typeof settings.data !== 'string') {
        settings.data = qstring.stringify(settings.data);
      }
      req.write(settings.data);
    }

    // Run the request.
    req.end();
  },

  // HTTP method helpers.
  post: helper('post'),
  get: helper('get'),

  // Redirect param() to querystring.stringify()
  param: function(obj){ return qstring.stringify(obj); }
};

// Export mock jQuery object.
module.exports = $;