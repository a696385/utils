"use strict";

var util = require("util"),
    fs = require("fs"),
    path = require("path");

var dirPath = path.join(__dirname, "logs"),
    isDevMode = true;

var writeFile = function(fileName, text) {
    var filePath = path.join(dirPath, fileName);
    try {
        var stream = fs.createWriteStream(filePath, { flags: "a" });
        stream.end(text, "utf8");
    } catch (exception) {
        console.log("Error write to file " + filePath);
        console.error(exception);
    }
};

var writeLog = function(message, exception, fileNamePrefix) {
    var date = new Date(),
        fileName = [
            fileNamePrefix,
            date.getFullYear(), date.getMonth() + 1, date.getDay()
        ].join("_"),
        exText = exception ? util.inspect(exception, true, null, false) : "",
        text = [date.toUTCString(), message, exText, "\n"].join("\n");

    fs.exists(dirPath, function(exists) {
        if(exists) {
            writeFile(fileName, text);
        } else {
            fs.mkdir(dirPath, function(err) {
                if(err) console.error(err);
                else writeFile(fileName, text);
            });
        }
    });
};

exports.init = function(root, appMode) {
    dirPath = path.join(root, "logs");
    isDevMode = appMode === 'dev';
};

exports.writeError = function(message, error) {
    if(isDevMode) {
        console.error(message, error);
    } else {
        writeLog(message, error, "catch");
    }
};

exports.writeExpressError = function(error) {
    var message = "Express Error";
    if(isDevMode) {
        console.error(message, error.stack);
    } else {
        writeLog(message, error, "catch");
    }
};

exports.writeUncaughtException = function(exception) {
    var message = "Domain Uncaught Exception";
    if(isDevMode) {
        console.error(message, exception);
    } else {
        writeLog(message, exception, "uncaught");
    }
};

exports.writeMobileDriverError = function(message, error) {
    if(isDevMode) {
        console.error(message, error);
    } else {
        writeLog(message, error, "mobile_driver");
    }
};