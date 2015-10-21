/*
* @providesModule FigwheelBridge
*/

var CLOSURE_UNCOMPILED_DEFINES = null;

var baseUrl = 'http://localhost:8081/'
var basePath = 'rn-test/build/out';

var queue = [];

// Next:
// - Figwheel will need some changes to work in a 'DOM-less' environment
//   - i.e. with web-worker react-native packager
//   - because it uses document.createElement and document.setInnerHTML
//   - but there is probably some setting I don't know about...
// - eval(window, args) may not work in web-worker either
// - it would be nice to add :target :web-worker to cljsbuild

function waitForTurn(src, content, callback){
  setTimeout(function(){
    if(queue.length > 0){
      if(queue[0] === src){
        eval.call(window, content);
        let last = queue.shift();
        if(last.indexOf('goog/net/jsloader') > -1) { shimJsLoader(); }
        console.log('Succesfully evaled. I think...');
        callback();
      }else{
        waitForTurn(src, content, callback);
      }
    }else{
      // ???
    }
  }, 100);
}

function loadSyncJS(src, cb) {
  if (typeof cb !== 'function') { cb = function(){}; }
  queue.push(src);

  var r = new XMLHttpRequest();
  r.open('GET', baseUrl + src, true);
  r.onreadystatechange = function () {
    if (r.readyState != 4 || r.status != 200) return;
    waitForTurn(src, r.responseText, cb);
  };
  r.send();
  console.log('GET: ' + src);
}

function startEverything() {
  if(typeof goog === "undefined") {
    console.log('Loading Closure base.');
    loadSyncJS(basePath + '/goog/base.js', function(){
      shim(goog, loadSyncJS, basePath);
      loadSyncJS(basePath + '/cljs_deps.js');
      loadSyncJS(basePath + '/goog/deps.js', function(){
        goog.require('rn_test.core');
        goog.require('figwheel.connect');
      });
    });
  }
}

module.exports = {
  start: startEverything
}

// Function to shim goog to use above write function instead of modifying the body...
function shim(goog, writeSync, basePath){
  console.log('Shimming google\'s Closure library.');
  // Sets goog.writeScriptSrcNode_ to above function
  //   Not sure if there is a native closure way to have code remotely evaled...
  //   (closure docs are confusing...)
  goog.writeScriptSrcNode_ = writeSync;
  // Clears up a small (document) error
  goog.writeScriptTag_ = function(src, opt_sourceText) {
    goog.writeScriptSrcNode_(src);
    return true;
  };
  // Sets goog basePath to above basePath plus the goog folder
  goog.basePath = basePath + '/goog/';


  // To fix figwheel errors
  // fake that we're in an html document
  goog.inHtmlDocument_ = function(){ return true; };
  // fake localStorage
  eval.call(window, 'var localStorage = {}; localStorage.getItem = function(){ return "true"; }; localStorage.setItem = function(){};');
  eval.call(window, 'var document = {}; document.body = {}; document.body.dispatchEvent = function(){}; document.createElement = function(){};');
}

// Loads and evals js over HTTP instead of adding script tags
//   have it call after src==='goog.net.jsLoader' in the async load above
//   or call it from figwheel start script...
function shimJsLoader(){
  goog.net.jsloader.load = function(uri, options) {
    var deferred = {
      callbacks: [],
      errbacks: [],
      addCallback: function(cb){
        this.callbacks.push(cb);
      },
      addErrback: function(cb){
        this.errbacks.push(cb);
      },
      callAllCallbacks: function(){
        while(this.callbacks.length > 0){
          this.callbacks.shift()();
        }
      },
      callAllErrbacks: function(){
        while(this.errbacks.length > 0){
          this.errbacks.shift()();
        }
      }
    };

    console.log(uri.getPath());
    console.log(options);

    loadSyncJS(uri.getPath(), function(){
      deferred.callAllCallbacks();
    });


    return deferred;
  }
}







