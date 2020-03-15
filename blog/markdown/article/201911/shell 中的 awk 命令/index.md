# shell 中的 awk 命令

AWK 是一种优良的文本处理工具，它允许创建简短的程序，这些程序读取输入文件、为数据排序、处理数据、对输入执行计算以及生成报表，还有 balabala 很多其他的功能。

个人觉得在 `格式化输出` 方面，非常有用。对于规则的内容，awk 可以逐行的读入，以空格为默认分隔符（可以使用 -F 指定分隔符）将每行切割分成一个个单独的域，不甚规则的内容也可以使用正则提取。

因为工作中经常用到，很多时候需要请教同事，或者查找资料，这里整理一下方便查阅。

## AWK 的程序结构

AWK 程序是由 `pattern { action }` **对** 组成的，其中 `pattern` 表示匹配条件，只有符合条件的行才会被 AWK 处理。

`pattern` 和 `action` 都是可选的，无 `pattern` 表示无匹配条件，而无 `action` 默认打印原始内容。

### 关于 pattern

`pattern` 一般可以用表达式，或者正则。

```shell
# 输出长度大于10的行
& awk 'length($0) > 10'

# 使用正则表达式，输出以 h 开头的行
& awk '/^h/ ~ $0'
# 可以简写成
& awk '/^h/'
```

常见的 `pattern` 除了 AWK 表达式之外，还有 `BEGIN` 或 `END`。这两种条件对应的 `action` 分别是读取所有的记录之前和之后。同时，如 `pattern1, pattern2` 的条件表示符合条件 `pattern1` 和 `pattern2` 的记录及其之间的部分。

```shell
& awk 'BEGIN { print "hello" }'
```

例如在程序开始的时候进行某个操作，这个时候无需使用管道，或者查询某个文件， `BEGIN` 中的动作就会执行，而 `END` 一般是作为统计结果的时候去输出。

### 关于 action

`action` 是具体要执行的逻辑，只有条件符合 `pattern` 的时候才会去执行。

它一般用于输出，也可以只执行某一段逻辑。同样的，`if else`，`for` 循环之类也包含在它的逻辑之中。下面是使用 awk 打印 99 乘法表

```shell
$ awk 'BEGIN {
    for(x=1; x<10; x++) {
        for(y=1; y<10; y++) {
            if (y <= x) {
                printf "%s * %s = %s \t", y, x, x * y
            }
        }
        printf "\n"
    }
}'

1 * 1 = 1
1 * 2 = 2 	2 * 2 = 4
...
```

## AWK 内置方法

AWK 内置了一些方法，以下是比较常用的。

### print

`print` 用于输出文本。比如 `{ print $0 }` 会打印当前的行，这里 `$0` 可以省略。

`{ print $1, $2 }` 会打印当前行的 组 1、组 2，用默认的分隔符。使用 `{ print "组1: $1, 组2: $2"}` 这种字符串模板的方式，可以更加明确的输出期望格式。

    { printf "name:%s, age:%s \n", name, age }

增强方法 `printf` 可以使用字符串模板来输出，更为方便。

### length

`length($0)` 可以获得当前行的长度，比如打印长度超过 20 的行：

    awk 'length($0) > 0' filename

### match

`match` 可以使用正则表达式来获取匹配项，包括子组，使得让命令非常灵活。 得知这个方法后如获至宝，之前觉得 awk 就差这点。

    match(string, regexp, array?)

语法如上，`string` 是需要查找的字符串， `regexp` 是正则表达式。

`array` 是可选的，在有 `array` 的情况下，会把匹配到的结果放入 `array` 中，包括子组。

经测试，非贪婪模式貌似不可用，mac 下需要安装 `gnu` 版本，`brew install gawk`

举个例子，提取网址和文本:

```shell
# 需要从这个文本中提取网址、文本
& content='<a href="http://www.baidu.com">百度</a>'

# 使用 match ，从中获取子组并格式化输出
$ echo $content | awk '{ match($0, /.*href="(.*)".*>(.*)</, a); printf "网址：%s, 文本：%s \n", a[1], a[2] }'

# output: 网址：http://www.baidu.com, 文本：百度
```

## AWK 内置变量

AWK 的内置变量包括域变量，例如$1, $2, $3，以及$0。这些变量给出了记录中域的内容。 内置变量也包括一些其他变量：

这部分编辑自 [维基百科](https://zh.wikipedia.org/wiki/AWK)。除了 `$NF` 其它并不常用。

|    名称    | 描述                                                                                     |
| :--------: | :--------------------------------------------------------------------------------------- |
|    `NR`    | 已输入记录的条数                                                                         |
|    `NF`    | 当前记录中域的个数。记录中最后一个域可以以 `$NF` 的方式引用。                            |
| `FILENAME` | 当前输入文件的文件名。                                                                   |
|    `FS`    | “域分隔符”，用于将输入记录分割成域。其默认值为“空白字符”。域分隔符可以用 `-F` 来替换。   |
|    `RS`    | 当前的“记录分隔符”。默认状态下，输入的每行都被作为一个记录，因此默认记录分隔符是换行符。 |
|   `OFS`    | “输出域分隔符”，即分隔 print 命令的参数的符号。其默认值为空格。                          |
|   `ORS`    | “输出记录分隔符”，即每个 print 命令之间的符号。其默认值为换行符。                        |
|   `OFMT`   | “输出数字格式”（Format for numeric output），其默认值为"%.6g"。                          |

## 一些例子

### 统计当前目录大小

```shell
# 查看当前目录
& ls -l

total 584
-rw-r--r--@   1 xxx  staff      50 Feb 28  2019 README.md
drwxr-xr-x    4 xxx  staff     128 Jan 23 16:31 config
-rw-r--r--    1 xxx  staff      63 Jan 22 23:42 lerna.json
drwxr-xr-x  577 xxx  staff   18464 Jan 21 21:13 node_modules
-rw-r--r--    1 xxx  staff  283916 Jan 22 23:42 package-lock.json
-rw-r--r--    1 xxx  staff    1034 Jan 22 23:42 package.json
drwxr-xr-x    5 xxx  staff     160 Jan 15 21:08 packages
drwxr-xr-x    5 xxx  staff     160 Mar 11 18:15 scripts

# 把第5列的加起来，统计出当前目录总大小
& ls -l | awk 'BEGIN { total = 0 } { total += $5 } END { print total }'

303975
```

### git 相关

```shell
# 获取当前分支名
& git branch | awk '$1 == "*" { print $2 }'

# 推送到远程分支
# 因为有时候分支名特别长，这时候，弄个 function 太方便了
& git push origin HEAD:refs/for/`git branch | awk '$1 == "*" { print $2 }'`
```

### 正则提取内容

```shell
& cat temp.log

[2019/11/12 13:39] ...balabala {"method":"/fetch/detail",..."message":"权限不足"}

& awk '{ match($0, /"method":"([^"]+).*"message":"([^"]+)/, a); printf "接口：%s, 错误：%s \n", a[1], a[2] }' temp.log

接口：/fetch/detail, 错误：权限不足
```

## 相关资料

[AWK - 维基百科](https://zh.wikipedia.org/wiki/AWK)
