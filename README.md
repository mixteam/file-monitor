#fmonitor

一个用于实时监控文件，并执行命令的工具

##准备工作

在需要监控的目录下创建`.monitor`文件，并编写其内容，例如：

	[spm build -compiler=closure]
	./package.json
	./src/class.js

中括号内为需要被执行的命令，以下每一行为需要被监控的文件。即当这些文件中的某一个被修改时，命令会自动被执行。

中括号内的如果有多个命令可以用半角逗号分隔。一个`.monitor`文件，可以描述多个被监控命令块。

## 使用

	$ fmointor [working_dir] [options]

* workding_dir（可选）：需要监控的目录，默认为当前目录
* options（可选）：
	* [-r/--recursion]：遍历当前目录下的所有子目录
	* [-m/--monitor]：监控描述文件，默认为`.monitor`
	* [-v/--version]：显示版本号
