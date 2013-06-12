/**
 * Stack Worker Module
 * @module utils/stackworker
 * @author Andy <andy@i2you.ru>
 */

var timers = require('timers'),
	utils = require('../utils');

// Set processor, setImmediate if 0.10 otherwise nextTick
var processor = timers.setImmediate ? timers.setImmediate : process.nextTick;

/**
 * Stack Worker
 * @param {Number} interval Work interval between jobs
 * @constructor
 */
var StackWorker = function(interval, canDoJob){
	if (interval == null) interval = 1000;
	if (canDoJob == null) canDoJob = function(){ return true; };
	this.interval = interval;
	this.canDoJob = canDoJob;
	this.jobs = [];
	this.worked = false;
};

/**
 * Add job to stack
 * @param {Object} owner THIS for function  call
 * @param {Function} func Job function
 * @param {Array} args Arguments for function call
 */
StackWorker.prototype.addJob = function(owner, func, args){
	this.jobs.push({
		owner: owner,
		f: func,
		args: args
	});
	this.start();
};

/**
 * Start execute all jobs
 */
StackWorker.prototype.start = function(){
	var self = this;
	if (self.worked) return;
	if (!self.canDoJob()) return;
	self.worked = true;
	var iterate = function(isFirst){
		var job;
		var first = self.jobs.splice(0, 1);
		if (first.length > 0){
			job = first[0];
		}
		if (!job){
			self.worked = false;
			return;
		}
		var onTimeOut = function(){
			var originalCallback = job.args.pop();
			if (utils.isFunction(originalCallback)){
				var fakeCallback = function(){
					var args = Array.prototype.slice.call(arguments);
					originalCallback.apply(this, args);
					iterate();
				};
				job.args.push(fakeCallback);
			} else {
				if (originalCallback) job.args.push(originalCallback);
				var fakeCallback = function(){
					iterate();
				};
				job.args.push(fakeCallback);
			}
			job.f.apply(job.owner, job.args);
		};
		if (!isFirst){
			if (self.interval > 0){
				setTimeout(onTimeOut, self.interval);
			} else {
				processor(onTimeOut);
			}
		} else {
			onTimeOut();
		}
	};
	iterate(true);
};

module.exports = StackWorker;