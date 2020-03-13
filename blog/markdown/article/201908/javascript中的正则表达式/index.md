# javascript 中的正则表达式

各语言对正则表达式都有支持，其中支持最好的我觉得应该是 `C#` 了，`shell` 的正则最麻烦，大概只有 `-P` 模式才好点。<br>
`javascript` 对正则的支持也不错，目前新版的chrome跟node已经支持了`逆向环视`。本篇文章主要是对javascript中的正则表达式做一个总结。

阅读之前需要对正则有一个基础概念。

## 声明正则表达式

正则表达式的声明方式有两种：

1. 使用构造函数来 `new` 一个 `RegExp` 对象，这种一般是正则需要动态构建的时候使用。
```js
var reg = new RegExp('正则表达式主体','修饰符(可选)');
```
2. 使用对象字面量来声明，大部分情况会这么使用。
```js
var reg = /正则表达式主体/修饰符(可选);
```

## 字符串方法

> 字符串中使用正则表达式作为参数的方法。

### search

    使用频率：★☆☆☆☆

用于检索字符串中指定的子字符串，或检索与正则表达式相匹配的子字符串，并返回子串的起始位置。<br>
但是这个方法用的是真的少，一般直接用 `indexOf` 就够了。

```js
var index = `helloworld`.search(/l/);
console.log(index); // output: 2
```

### replace

    使用频率：★★★★☆

使用正则表达式替换字符串中的内容，返回替换后的字符串。很常用的方法。

```js
语法：
str.replace(regexp|substr, newSubStr|function)
```

|   参数    |    类型    |                描述                |
| :-------: | :--------: | :--------------------------------- |
|  regexp   |  `RegExp`  | 需要被替换的字符串对应的正则表达式 |
|  substr   |  `string`  | 需要被替换的字符串                 |
| newSubStr |  `string`  | 替换的字符串                       |
| function  | `Function` | 用于返回替换字符串的方法           |

```js
// 举个function的例子，如果想把字符串中script标签的地址，
// 如果是相对路径就加一个cdn的prefix:

var content = `
<script src="1.js"></script>
<script src="https://xxx/2.js"></script>
<script src="3.js"></script>
`;

content.replace(/(script\s*src=")([^"]+)/g, (g0, g1, g2) => {
    // g0 是整个匹配的字符串
    // g1 是第一个子串
    // g2 是第二个子串，如果还有子串，就是 g3,g4...

    // 如果是某个网络地址
    if (/^http/.test(g2)) {
        return g0;
    }
    // 如果是相对路径，返回cdn的地址
    return g1 + 'https://cdn.xxx.com/' + g2;
});

// output:
// <script src="https://cdn.xxx.com/1.js"></script>
// <script src="https://xxx/2.js"></script>
// <script src="https://cdn.xxx.com/3.js"></script>
```

### match

    使用频率：★★★★☆

方法检索返回一个字符串匹配正则表达式的的结果（RegExpMatchArray）。如果没有匹配到，则返回 `null`。

`RegExpMatchArray` 是一个伪数组，还包括了一些其他的属性。这一段摘自 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/String/match)：

  属性   |                           描述
:------: | :--------------------------------------------------------
`groups` | 一个捕获组数组 或 `undefined`（如果没有定义命名捕获组）。
`index`  | 匹配的结果的开始位置
`input`  | 搜索的字符串

#### 全局匹配的情况

在含有 `g` 参数的时候，会返回所有与正则表达式匹配的结果，忽略子组的匹配。

适用于查找所有匹配项。

```js
const content = `
<script src="1.js"></script>
<script src="2.js"></script>
<script src="3.js"></script>
`;

const reg = /src="(\S+?)"/g;

console.log(content.match(reg));
// output:
// ['src="1.js"', 'src="2.js"', 'src="3.js"']
```

#### 只获取匹配到的第一项

在无 `g` 参数的时候，会返回 [`整个匹配项`、`子组1`、`子组2`、`...`]

适用于提取多个特定字符串。

```js
// 如果去掉 g ，会返回子组的匹配情况。提取某个特定字符串会经常这么用。

const content = `
<script src="1.js"></script>
<script src="2.js"></script>
<script src="3.js"></script>
`;

const reg = /src="(\S+?)"/;

console.log(content.match(reg));
// output:
// ['src="1.js"', '1.js']
```

## 正则表达式方法

> `RegExp` 对象的一些以 `string` 为参数的方法。

### test

    使用频率：★★★★☆

通常用于检测一个字符串是否符合某个正则的规则，返回 `true`/`false`。

```js
const content = '123456';

console.log(/^\d+$/.test(content));
// output: true
```

切记使用 `test` 的时候不要用全局匹配 `g`，如果用全局匹配的话，每次匹配都会记录匹配的位置，下次匹配会从上一次匹配到的位置之后进行查找。

### exec

    使用频率：★★★★☆

`exec` 通常用于在全局查找包含了多个子项的情景，功能十分强大。

`reg.exec` 在每次调用，都会获取一次 `string.match` 调用的结果，得到 [`整个匹配项`、`子组1`、`子组2`、`...`]，然后记录之前匹配的位置，下次调用就从新的位置开始查找。

> 记住 `exec` 是跟 `g` 一起用的，如果不是全局模式，那么每次调用都会从头开始查找，失去了查找所有的能力。

```js
const content = `
<script data-key="key1" src="1.js"></script>
<script data-key="key2" src="2.js"></script>
<script data-key="key3" src="3.js"></script>
`;

const reg = /data-key="(\S+?)"\s*src="(\S+?)"/g;

let m;
let matches = [];

while (m = reg.exec(content)) {
    matches.push(m);
}

console.log(matches);

// output:
// [
//     ['data-key="key1" src="1.js"', 'key1', '1.js'],
//     ['data-key="key2" src="2.js"', 'key2', '2.js'],
//     ['data-key="key3" src="3.js"', 'key3', '3.js']
// ]
```

exec 每次获取到到也是一个伪数组，额外还有 `index`，`input` 字段，`index`表示前一次匹配到的位置，`input`表示原始的字符串。

之前写过一篇文章 [写一个 javascript 模板引擎](https://wqnmlgbd.net/article/javascript_template_engine)，其中的匹配使用了 `exec` 方法，有兴趣可以移步。

## 一些使用情景

> 这里罗列一些在日常工作或学习中感觉值得记下来的场景。

### 包含了且只包含

> 判断一个字符串，包含了 `a`、`b`、`c` 3种字符，且只包含了这3种字符。

```js
const reg = /^(?=.*a.*)(?=.*b.*)(?=.*c.*)[abc]+$/;

reg.test('a');    // false
reg.test('abc');  // true
reg.test('abcd'); // false
```

这里用了 `正向环视`，`(?=xxx)`表示接下来有什么，那么 `/^(?=.*a.*)(?=.*b.*)(?=.*c.*)[abc]+$/` 就有了这些约束：

1. 后面有a
2. 后面有b
3. 后面有c
4. 整个字符串由 a或b或c 组成

归纳一下，就表示：字符串中包含的有 `a`、`b`、`c`，且只包含了 `a`、`b`、`c`。

`环视` 这个词，相同含义的还有 `预查`、`断言`等，延伸出来的什么 正向肯定预查，0宽断言之类，大多是翻译问题。为了避免沟通上的障碍，以`《精通正则表达式》`这本书中为准，使用`环视`来称呼这种查找。

## 结语

正则表达式很强大，使用情景也很复杂，本篇文章只是罗列了常用方法的用法，想要去完全掌握和提高还是需要日积月累。

之后会慢慢补充一些使用场景进来。
