# shell 中的参数传递

在执行 shell 脚本的时候，可以向脚本传递参数，shell 中的方法执行也可以传参，另外还包含了一些复杂的情况。

这块一直很模糊，用到的时候才去查，这里做个总结。

## 依次获取

### \$0,\$1,\$2...

在使用 `sh script.sh "hello" "world"` 的时候，可以使用 `$0,$1,\$2...` 去依次获取脚本命令行传入的参数。

`$1` 得到的是 `hello`，`$2` 得到的是 `world`，依次类推。

可以使用 `$@` 来获取所有参数：

```bash
for item in "$@"
do
    echo $item
done
```

此种方法也可用于函数中获取参数。

### 获取脚本路径

`$0` 获取到的是脚本路径以及脚本名，比如：

`sh a.sh`，`$0` 是 `a.sh`<br>
`sh a/b.sh`，`$0` 是 `a/b.sh`

在获取当前脚本目录的时候很有用，因为 shell 中的路径是相对于 cwd 的，如果在脚本中使用相对路径，可能会发生不可知的问题，所以我个人习惯先定位到脚本所在目录，或者项目根目录。

```shell
# 脚本所在目录

SCRIPT_DIR=$(cd `dirname $0`; pwd)
```

## 使用 getopts

使用上面的方式对于参数少的情况下挺方便，但如果参数多，就可能弄混，可读性不好。另外如果脚本有修改也容易造成错误，毕竟对于参数顺序有依赖。

另一种优雅的方式是使用 `getopts`，直接看一个例子：

```bash
#!/bin/bash

function Usage() {
    cat << EOF
--- Usage start ---
-n name
-a age
--- Usage end ---
EOF
}

while getopts ":n:a:" opt
do
    case "$opt" in
        n)
            echo "name is $OPTARG"
            ;;
        a)
            echo "age is $OPTARG"
            ;;
        ?)
            Usage
            exit 1
            ;;
    esac
done

# 调用：
sh xxx.sh -n tom -a 233

```

`getopts` 用来分析位置参数，格式为：

```bash
getopts optstring optname
```

`optstring` 包含需要被识别的选项字符。第一个 `:` 表示忽略错误参数，如果其中的字符后面跟着一个冒号，表明该字符选项需要一个选项值，其字符选项需要以空格分隔，一般与 while 一起用。

`getopts` 每次被调用时，它会将下一个选项字符放置到变量 `optname` 中，选项如果有对应的值，会放在变量 `$OPTARG` 里面，`$OPTIND` 表示参数索引，从 1 开始。

## 环境变量

把变量 `export` 一下，之后的 `子shell` 就都可以用了
