#!/usr/bin/env node
// -*- js -*-

var fs = require("fs"), 
	path = require("path"),
	util = require('util'),
	spawn = require('child_process').spawn, 
	exec = require('child_process').exec,

	VERSION = '0.2.0',
	INTERVAL = 500,

	options = {
		recursion : false,
		monitor_file : '.monitor',
		working_dir : './'
	},

	CMD_REGEXP = /^\[([^\[\]]+)\]$/,
	EMPTY_LINE_REGEXP = /^[\r\n]*$/
	;

process.on('uncaughtException', function (err) {
  console.error('Caught exception: ' + err);
});

function shouldMonitor(dirname) {
	var file = path.join(dirname, options.monitor_file);

	return fs.existsSync(file);
}

function parseMonitor(monitorFile) {
	var lines = monitorFile.split(/[\r\n]/g),
		monitorList = [],
		monitorGroup
		;

	lines.forEach(function(line) {
		var cmds;

		if (line.match(EMPTY_LINE_REGEXP)) return;

		if ((cmds = line.match(CMD_REGEXP))) {
			if (monitorGroup) {
				monitorList.push(monitorGroup);
				monitorGroup = undefined;
			}

			monitorGroup = { commands : cmds[1].split(/,\s*/), files : []}
		} else {
			monitorGroup.files.push(line);
		}
	});

	if (monitorGroup) {
		monitorList.push(monitorGroup);
	}

	return monitorList;
}

function runCmds(dirname, cmds) {
	var opt = {
			cwd : dirname, 
			encoding : 'utf8'
		},
		cmd
		;

	if (cmds.length) {
		cmd = cmds.shift();
		exec(cmd, opt, function(error, stdout, stderr) {
			stdout && util.log(stdout);
			(error || stderr) && util.error(error || stderr);
			runCmds(dirname, cmds);
		});

		util.debug(new Date().toTimeString().match(/\d{1,2}\:\d{1,2}\:\d{1,2}/g)[0] + 
					' - [run] ' + cmd + ' ');
	}
}

function monitorFile(file, callback) {
	var lastTimestamp;

	if (fs.existsSync(file)) {
		lastTimestamp = fs.statSync(file).mtime.getTime();
	} else {
		lastTimestamp = 0;
	}

	return setInterval(function() {
		if (fs.existsSync(file)) {
			var stat = fs.statSync(file),
				timestamp = stat.mtime.getTime()
				;

			if (timestamp !== lastTimestamp) {
				lastTimestamp = timestamp;
				callback();
			}
		}
	}, INTERVAL);
}

function monitorGroup(dirname, group) {
	var cmds = group.commands,
		files = group.files,
		fileMonitorId = []
		;

	files.forEach(function(file) {
		var id;

		filepath = path.join(dirname, file);

		id = monitorFile(filepath, function() {
			runCmds(dirname, cmds.slice(0));
		});

		fileMonitorId.push(id);
	});

}

function monitorDir(dirname) {
	var filepath = path.join(dirname, options.monitor_file),
		strFile = fs.readFileSync(filepath, 'utf8'),
		monitorList = parseMonitor(strFile)
		;

	
	monitorList.forEach(function(group) {
		monitorGroup(dirname, group);
	})
	
    util.debug(new Date().toTimeString().match(/\d{1,2}\:\d{1,2}\:\d{1,2}/g)[0] + 
			' - [monitor] success to "' + 
			dirname + '"\n');
}

function recurs(dirname, recursion) {
	var dirlist = [],
		indir


	if (shouldMonitor(dirname)) {
		dirlist.push(dirname);
	}

	if (recursion) {
		indir = fs.readdirSync(dirname);
		indir.forEach(function(name) {
			if (!(name in ['.', '..', '.git', '.svn'])) {
				var pathname = path.join(dirname, name),
					stat = fs.statSync(pathname)
					;

				if (stat.isDirectory()) {
					dirlist = dirlist.concat(recurs(pathname, recursion));
				}
			}
		});
	}

	return dirlist;
}

function parse(dirname) {
	var recursion = options.recursion,
		dirlist
		;

	dirlist = recurs(dirname, recursion);

	dirlist.forEach(function(dir) {
		monitorDir(dir);
	});
}

function main(args) {
	if (args && args instanceof Array){
		while (args.length > 0) {
			var v = args.shift();
			switch(v) {
				case '-r':
				case '--recursion':
					options.recursion = true;
					break;
				case '-m':
				case '--monitor':
					options.monitor_file = args.shift();
					break;
				case '-v':
				case '--version':
					util.print('version ' + VERSION);
					process.exit(0);
				default:
					options.working_dir = v;
					break;
			}
		}
	}else if (args && typeof args === 'object') {
		for (var k in args) {
			options[k] = args[k];
		}
	}


	if (!options.working_dir) {
		util.error('no working dir for monitor');
	} else {
		parse(options.working_dir);
	}
}

if (require.main === module) {
	main(process.argv.slice(2));
} else {
	module.exports = main;
}