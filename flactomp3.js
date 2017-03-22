var fs = require('fs');
var path = require('path');
var exec = require('child_process');
var inputDir = process.argv[2] || null;
var outputDir = process.argv[3] || null;
var i = 0;
var pathArray;

/**
 * Check if input string finish by flac.
 * @param {string} input 
 */
var checkFlac = function (input) {
	return (input.match(/\.flac$/)) ? true : false;
}

/**
 * Create an array wich contained the path of input flac file, and output mp3 file.
 * @param {string} inputPath 
 * @param {string} outputPath 
 */
var getPathArray = function (inputPath) {
		var stat;
		var child;
		var children;
		var file;
		var files = fs.readdirSync(inputPath);
		var result = [];

		for (file of files) {
			file = path.resolve(inputPath, file);
			stat = fs.statSync(file);
			if (stat && stat.isDirectory()) {
				children = getPathArray(file);
				for (child of children) result.push(child);
			}
			else if (checkFlac(file)) {
				result.push(file);
			}
		}
		return result;
}

/**
 * Callback function to child_process.exec.
 * @param {*} err 
 * @param {*} stdout 
 * @param {*} stderr 
 */
var execute = function (err, stdout, stderr) {
	var matches = stderr.match(/Error/mig);

	i++;
	if (!matches) return ;
	matches = stderr.match(/\/.*\.mp3/gm);
	fs.unlinkSync(matches[0]);
}

/**
 * Callback pass to for each function, use on pathArray.
 * @param {string} value 
 * @param {number} index 
 */
var fileLoop = function (value, index) {
	var command;
	var result;
	var mp3;

	/* mp3 path string creation */
	mp3 = value
	.replace(/\.flac$/, '.mp3')
	.replace(/^(\/.*)\//g, outputDir + '/');

	/* Return if file already exists. */
	if (fs.existsSync(mp3)) {
		i++;
		return ;
	}

	/* Command creation */
	command = "ffmpeg -i ";
	command += value.replace(/(["\s'$`\\\(\)&])/g,'\\$1')
	command	+= " -ab 320k -map_metadata 0 -id3v2_version 3 "
	command	+= mp3.replace(/(["\s'$`\\\(\)&])/g,'\\$1');

	/* Process */
	result = exec.exec(command, { encoding: "utf8" }, execute);
}

/**
 * Callback to setInterval, use to check if playlist is fully
 * converted and exit.
 */
var processLoop = function () {
	if (i == pathArray.length) {
		console.log("Process finish, exiting ...");
		process.exit(0);
	}
}

/* Check if the two argument are passed, or exit. */
if (!inputDir || !outputDir) {
	console.error("usage: [ INPUT DIR ] [ OUTPUT DIR ]");
	process.exit(1);
}

/* Getting path arrays. */
pathArray = getPathArray(inputDir);

/* Execute ffmpeg for all files */
pathArray.forEach(fileLoop);

/* Check if process has finish and exit. */
setInterval(processLoop, 1000);
