# 写一个 javascript 模板引擎

> 我就是要自己写一个模板引擎，只要 40 行。
> 而且她是兼容 ie6 的 0_o

<br>

js 模板引擎有很多很多，我以前经常用 art-template ，有时候也会拿 vue 来当模板引擎用。

之前在携程商旅的时候，代码规范是 **未经允许不能使用 【外部代码】** ，囧。

有了需求，那么就去写吧，当时因为一些原因没用上。后来分了产线，自己搭了一套构建，用了几个月感觉挺爽，把这小段代码按照比较大众的规范重写，跟大家分享下。

[mini-tpl 在 github 的代码仓库](https://github.com/shalldie/mini-tpl 'mini-tpl 源码')

<br>

## 模板语法

首先是选择模板语法，ejs 语法是首选，因为大众，更无需去学习指令型模板引擎的那些东西。

如果写过 jsp 或者 asp/asp.net 的可以直接上手。

```js
// es6 module , typescript
import tpl from 'mini-tpl';
// nodejs
// const tpl = require('mini-tpl');

const content = `
<ul>
<% for(var i=0; i < data.length; i++){
    var item = data[i];
    if(item.age < 30) { %>
        <li>我的名字是<%=item.name%>，我的年龄是<%=item.age%></li>
    <% } else { %>
        <li>my name is <%=item.name%>,my age is a sercet.</li>
    <% } %>
<% } %>
</ul>`;

const data = [
    { name: 'tom', age: 12 },
    { name: 'lily', age: 24 },
    { name: 'lucy', age: 55 }
];

console.log(tpl(content, data));
```

<br>

## 核心方法

实现模板引擎的关键是 **Function** 方法。

> new Function ([arg1[, arg2[, ...argN]],] functionBody)

    arg1, arg2, ... argN
        被函数使用的参数的名称必须是合法命名的。
        参数名称是一个有效的JavaScript标识符的字符串，或者一个用逗号分隔的有效字符串的列表;
        例如“×”，“theValue”，或“A，B”。
    functionBody
        一个含有包括函数定义的JavaScript语句的字符串。

使用 Function 构造器生成的函数，并不会在创建它们的上下文中创建闭包；它们一般在全局作用域中被创建。
当运行这些函数的时候，它们只能访问自己的本地变量和全局变量，不能访问 Function 构造器被调用生成的上下文的作用域。[MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function#Description)

也就是说:

1. 可以用 `new Function` 来动态的创建一个函数，去执行某动态生成的函数定义 js 语句。
2. 通过 new Function 生成的函数，作用域在全局。
3. 那么传参有 3 种：`把变量放到全局(扯淡)`、`函数传参`、用 `call/apply` 把值传给函数的 this。

最初我用的是 `call` 来传值，后来想了想不太优雅，换成了 `用参数传递`。也就是这样：

```js
const content = 'console.log(data);';

let func = new Function('data', content);

func('hello world'); // hello world
```

到此为止，一个最简单的模板引擎的雏形已经有了。下面来拆分一下具体实现。

<br>

## 模板拆分

先看看模板：

```js
<% for(var i=0; i<data.length; i++) {
    var item = data[i];
    if(item.age < 30){%>
        <li>我的名字是<%=item.name%>，我的年龄是<%=item.age%></li>
    <%}else{%>
        <li>my name is <%=item.name%>,my age is a sercet.</li>
    <%}%>
<% } %>
```

js 逻辑部分，由 **<%%>** 包裹，js 变量的占位，由 **<%= %>** 包裹，剩下的是普通的要拼接的 html 字符串部分。

也就是说，需要用正则找出的部分有 3 种：

1. **<%%>** 逻辑部分的 js 内容
2. **<%=%>** 占位部分的 js 内容
3. 其它的 **纯文本** 内容

其中第二项，js 占位，也属于拼接文本。在使用正则的时候可以一起查出来。

<br>

## 正则提取

提取内容的唯一选择是使用正则表达式。
因为要多次从模板中，把 `js 逻辑部分` 和 `文本` 依次提取出来。
对于每一次提取，都要获取提取出的内容，本次匹配最后的索引项(用于提取文本内容)。

所以我选择了 `RegExp.prototype.exec`，它的返回值是一个集合（伪数组）：

| 属性/索引    | 描述                                        |
| :----------- | :------------------------------------------ |
| `[0]`        | 匹配的全部字符串                            |
| `[1],...[n]` | 括号中的分组捕获                            |
| `index`      | 匹配到的字符位于原始字符串的基于 0 的索引值 |
| `input`      | 原始字符串                                  |

通过这样，就可以拿到匹配到的 js 逻辑部分，并通过 index 和本次匹配到的内容，来获取每个 js 逻辑部分之间的文本内容项。

要注意，在全局匹配模式下，正则表达式会接着上次匹配的结果继续匹配新的字符串。

```js
/**
 * 从原始模板中提取 文本/js 部分
 *
 * @param {string} content
 * @returns {Array<{type:number,txt:string}>}
 */
function transform(content) {
    var arr = []; //返回的数组，用于保存匹配结果
    var reg = /<%([\s\S]*?)%>/g; //用于匹配js代码的正则
    var match; //当前匹配到的match
    var nowIndex = 0; //当前匹配到的索引

    while ((match = reg.exec(content))) {
        // 保存当前匹配项之前的普通文本/占位
        appendTxt(arr, content.substring(nowIndex, match.index));
        //保存当前匹配项
        var item = {
            type: 1, // 类型  1- js逻辑 2- js 占位 null- 文本
            txt: match[1] // 内容
        };
        if (match[1].substr(0, 1) == '=') {
            // 如果是js占位
            item.type = 2;
            item.txt = item.txt.substr(1);
        }
        arr.push(item);
        //更新当前匹配索引
        nowIndex = match.index + match[0].length;
    }
    //保存文本尾部
    appendTxt(arr, content.substr(nowIndex));
    return arr;
}

/**
 * 普通文本添加到数组，对换行部分进行转义
 *
 * @param {Array<{type:number,txt:string}>} list
 * @param {string} content
 */
function appendTxt(list, content) {
    content = content.replace(/\r?\n/g, '\\n');
    list.push({ txt: content });
}
```

上面是从模板里面把 js 逻辑、占位 和 普通文本提取出来，之后拼接一下，通过 `new Function` 动态构造一个新的方法：

```js
/**
 * 模板 + 数据 =》 渲染后的字符串
 *
 * @param {string} content 模板
 * @param {any} data 数据
 * @returns 渲染后的字符串
 */
function render(content, data) {
    data = data || {};
    var list = ['var tpl = "";'];
    var codeArr = transform(content); // 代码分割项数组

    for (var i = 0, len = codeArr.length; i < len; i++) {
        var item = codeArr[i]; // 当前分割项

        if (item.type == 1) {
            // js逻辑
            list.push(item.txt);
        } else if (item.type == 2) {
            // js占位
            var txt = 'tpl+=' + item.txt + ';';
            list.push(txt);
        } else {
            //文本
            var txt = 'tpl+="' + item.txt.replace(/"/g, '\\"') + '";';
            list.push(txt);
        }
    }
    list.push('return tpl;');

    return new Function('data', list.join('\n'))(data);
}
```

<br>

## UMD 打包

套个 umd 的壳子，perfect >\_<#@!

```js
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        // es6 module , typescript
        var mo = factory();
        mo.__esModule = true;
        mo['default'] = mo;
        module.exports = mo;
    } else {
        // browser
        root.miniTpl = factory();
    }
}(this, function () {
    // ...code
    return render;
});
```

至此一个超简单的模板引擎就完成了，只有几十行，兼容 ie6。
