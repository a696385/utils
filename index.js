/**
 * Tools Module
 * @module utils
 * @author Andy <andy@i2you.ru>
 */

var crypto = require('crypto'),
	fs = require('fs'),
	async = require('async'),
	path = require('path'),
	http = require("http"),
	https = require('https');

exports.StackWorker = require('./stackworker');

var F = function () {};
/**
 * Inherit parent for child class
 * @example
 * 		function Child(){};
 * 		function Parent(){};
 * 		inherit(Child, Parent);
 * @param {Function} C Child class
 * @param {Function} P Parent class
 */
exports.inherit = function (C, P) {
	F.prototype = P.prototype;
	C.prototype = new F();
	C.uber = P.prototype;
	C.prototype.constructor = C;
};

/**
 * Create unique ID
 * @returns {String} Unique ID
 */
exports.createId = function(){
	var current_date = (new Date()).valueOf().toString();
	var random = Math.random().toString();
	var result = crypto.createHash('sha1').update(current_date + random).digest('hex');
	return result;
};

/**
 * Check param is function
 * @param fn
 * @returns {Boolean}
 */
exports.isFunction = function(fn){
	var result = typeof fn === 'function';
	return result;
};

/**
 * Round number to need precision
 * @param {Number} rnum original number
 * @param {Number} rlength precision count
 * @returns {number}
 */
exports.roundNumber = function(rnum, rlength) {
	var result = Math.round(rnum * Math.pow(10, rlength)) / Math.pow(10, rlength);
	return result;
}

/**
 * Format integer with first zero chars
 * @param {Number} n Original number
 * @param {Number} l Result number length
 * @returns {string}
 */
exports.intFormat = function(n, l){
	var s = "" + n;
	while(s.length < l) s = "0" + s;
	return s;
};

/**
 * Extra Trim function
 * @param {String} s original string
 * @param {Array} trimChars Array of trimmed chars
 * @returns {String}
 */
exports.extraTrim = function(s, trimChars){
	if (trimChars == null) trimChars = [' '];
	var result = "", firstChar = 0, lastChar = s.length - 1;
	for(var i = 0, l = s.length; i < l;i++){
		var char = s[i];
		if (trimChars.indexOf(char) == -1){
			firstChar = i;
			break;
		}
	}
	for(var i = s.length - 1, l = 0; i >= l;i--){
		var char = s[i];
		if (trimChars.indexOf(char) == -1){
			lastChar = i;
			break;
		}
	}
	if (firstChar !== lastChar){
		result = s.substring(firstChar, lastChar + 1);
	}
	return result;
};

/**
 * Convert arguments of function to array
 * @param {Object} args
 */
exports.argumentsToArray = function(args){
	return Array.prototype.slice.call(args);
};

/**
 * Extend options with default params
 * @param {Object} options Source object
 * @param {Object} defaultOptions Default values for options
 * @returns {Object}
 */
exports.extendDefaultOptions = function(options, defaultOptions){
	var key;
	if (typeof options === 'object') {
		for (key in defaultOptions) {
			if(defaultOptions.hasOwnProperty(key))
				options[key] = exports.extendDefaultOptions(options[key], defaultOptions[key]);
		}
		return options;
	} else if (options != null)
		return options;
	else
		return defaultOptions;
};

/**
 * Get sub files in directory with recourse
 * @param {String} sourcePath
 * @param callback
 */
exports.getSubFiles = function(sourcePath, callback){
	var findFiles = function(sourcePath, callback){
		fs.readdir(sourcePath, function(err, files) {
			var fileList = [], dirList = [];
			async.each(files, function(file, next){
				fs.stat(path.join(sourcePath, file), function(err, stats){
					if (err){
						next(err);
					} else {
						if (stats.isDirectory()){
							dirList.push(path.join(sourcePath, file));
						} else if (stats.isFile()){
							fileList.push(path.join(sourcePath, file));
						}
						next();
					}
				});
			}, function(err){
				if (err){
					callback(err);
				} else {
					var result = [].concat(fileList);
					if (dirList.length === 0){
						callback(null, result);
					} else {
						async.each(dirList, function(dir, next){
					   		findFiles(dir, function(err, subres){
								if (err) {
									next(err);
								} else {
									result = result.concat(subres);
									next();
								}
							});
						}, function(err){
							if (err){
								callback(err);
							} else {
								callback(null, result);
							}
						});
					}
				}
			});
		});
	};
	findFiles(sourcePath, function(err, files){
		if (err){
			callback(err);
		} else {
			files = files.map(function(el){
				el =  el.substr(sourcePath.length);
				if (el.substr(0,1) === '/' || el.substr(0,1) === '\\'){
					el = el.substr(1);
				}
				el = el.split('\\').join('/');
				return el;
			});
			callback(null, files);
		}
	});
};

/**
 * Load all modules into object
 * @param {Object} target Target object to loaded modules
 * @param {String} source Path for loading
 * @param callback
 */
exports.loadModules = function(target, source, callback){
	exports.getSubFiles(source, function(err, files){
		if (err){
			callback(err);
		} else {
			files = files.filter(function(file) {
				return (file.substr(-3) === '.js');
			});
			for(var i = 0, l = files.length; i<l; i++){
				var file = files[i];
				var fn = path.basename(file, '.js');
				try{
					target[fn] = require(path.join(source, file));
				} catch(e){
					callback(e);
					return;
				}
			}
			callback();
		}
	});
};

/**
 * HTTP/HTTPS get post request
 * @param {Object} options
 * @param {String} options.url HTTP URL full format
 * @param {String} [options.uri] HTTP Lockup path assigned to url
 * @param {Object} [options.data] Data for get/post http
 * @param {String} [options.method] Method GET/POST/PUT/DELETE - Default GET
 * @param {String} [options.responseType] json/text - Default text
 * @param {String} [options.requestType] json/text - Default text
 * @param {Function} callback
 */
exports.httpRequest = function(options, callback){
	var defaultPorts = {http: 80, https: 443};
	options.data = options.data || {};
	options.method = options.method || 'GET';
	options.requestType = options.requestType || 'text';
	options.responseType = options.responseType || 'text';
	callback = callback || function(){};

	if (options.uri){
		if (options.url.substr(-1) != '/'){
			options.url += '/';
		}
		if (options.uri.substr(0,1) === '/'){
			options.uri = options.uri.substr(1);
		}
		options.url += options.uri;
	}

	var method = options.method.toLowerCase();
	var requestType = options.requestType.toLowerCase();
	var responseType = options.responseType.toLowerCase();

	var protocol = options.url.substring(0,options.url.indexOf('//')).toLowerCase();
	protocol = protocol.substr(0, protocol.length-1);

	options.url = options.url.substr(protocol.length + 3);
	if (options.url.indexOf('/') === -1)
		options.url += '/';
	var host = options.url.substring(0,options.url.indexOf('/'));
	var port = defaultPorts[protocol];
	if (host.indexOf(':') !== -1){
		host = host.split(':');
		port = parseInt(host[1]);
		host = host[0];
	}
	var path = options.url.substring(options.url.indexOf('/'));

	var data = '';
	if (method === 'get' && requestType === 'text'){
		var pairs = [], postDataString;
		exports.foreach(options.data, function(v, p) {
			pairs.push(p + "=" + encodeURIComponent(v));
		});
		postDataString = pairs.join("&");

		if (postDataString)
			data = '?' + postDataString;
	}else{
		data = JSON.stringify(options.data);
	}

	var options = {
		host: host,
		port: port,
		path: path + (method !== 'get' ? '' : data)
	};
	if (method !== 'get'){
		if (requestType === 'text')
			options.headers = {'Content-Type': 'application/x-www-form-urlencoded'};
		else
			options.headers = {'Content-Type': 'application/json'};
	}
	var provider = (protocol === 'http' ? http : https);

	var response = '';
	var post_req = provider.request(options, function(res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			response += chunk;
		});
		res.on('end', function(){
			if (responseType === 'json'){
				try{
					response = JSON.parse(response);
				}catch(e){
					callback(e);
					return;
				}
			}
			callback(null, response);
		});
	});

	post_req.on('error', function(e) {
		callback(e);
	});

	if (method !== 'get'){
		post_req.write(data);
	}
	post_req.end();

};

/**
 * Source array or object iterate
 *
 * @param source Array or Object
 * @param {Function} callback
 *      Method with args: value, index for array or property name for object.
 *      If return false - break iterate
 */
exports.foreach = function(source, callback) {
	if(source.constructor === Array) {
		for(var i = 0, length = source.length; i < length; i++) {
			if(callback(source[i], i) === false) break;
		}
	} else {
		for(var p in source) {
			if(source.hasOwnProperty(p)) {
				if(callback(source[p], p) === false) break;
			}
		}
	}
};

/**
 * Clone Object
 * @param {Object} obj Source object
 * @returns {Object}
 */
exports.clone = function(obj) {
	if (null == obj || "object" != typeof obj) return obj;

	if (obj instanceof Date) {
		var copy = new Date();
		copy.setTime(obj.getTime());
		return copy;
	}

	if (obj instanceof Array) {
		var copy = [];
		for (var i = 0, len = obj.length; i < len; i++) {
			copy[i] = exports.clone(obj[i]);
		}
		return copy;
	}

	// Handle Object
	if (obj instanceof Object) {
		var copy = {};
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = exports.clone(obj[attr]);
		}
		return copy;
	}

	throw new Error("Unable to copy obj! Its type isn't supported.");
};
