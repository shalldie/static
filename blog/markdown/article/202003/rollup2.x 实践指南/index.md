# rollup2.x 实践指南

<img src="assets/cover.jpg">

    最近给一些老项目用的 `rollup` 升了个级，发现 `2.x` 的好多依赖包都换名字了... 颇费了些功夫，必须做个记录。
    吐槽：
    中文版文档太老了，还是1.x的，很久很久没人更新。
    官网英文版的一些demo也跑不起来 =。=

## 概述

`Rollup` 是一个 `JavaScript` 模块打包器，可以将小块代码编译成大块复杂的代码，例如 `library` 或 `应用程序`。对我而言，是提供了 `webpack` 之外另一种打包方案，且这种方案在打包 `library` 的时候特别优秀且方便。

配置了一个 rollup 配置生成器，可以点击 [@nosaid/rollup][@nosaid/rollup] 查看。

以下特性相关描述，部分摘抄自 rollup 中文网。

### Tree-shaking

除了使用 `ES6` 模块之外，`Rollup` 还静态分析代码中的 `import`，并将排除任何未实际使用的代码。这允许您架构于现有工具和模块之上，而不会增加额外的依赖或使项目的大小膨胀。

### 兼容性

`Rollup` 可以通过插件导入已存在的 `CommonJS` 模块。

### 发布 ES6 模块

这个是 `webpack` 目前做不到的！ `webpack` 可以打包别人的 `es6 模块`，但是自己的打包产出是没有 `es6` 这一项的。

`Rollup` 一般可以编译为 `UMD` 或 `CommonJS` 格式，然后在 `package.json` 文件的 `main` 属性中指向当前编译的版本。如果你的 `package.json` 也具有 `module` 字段，像 `Rollup` 和 `webpack 2+` 这样的 ES6 感知工具(ES6-aware tools)将会直接导入 `ES6` 模块版本。

## 创建一个 bundle

### 安装

```bash
$ npm install rollup --save-dev
```

### 入口

需要一个打包入口

```bash
$ vim src/main.js
```

### 配置

不考虑 command line 了，一般的场景还是需要单独的配置文件。

```bash
$ vim rollup.config.js
```

```ts
export default {
    input: 'src/main.js',
    output: {
        file: 'bundle.js',
        format: 'cjs'
    },
    plugins: [
        // ...
    ]
};
```

```shell
$ vim package.json
```

```json
{
    "scripts": {
        "build": "rollup -c"
    }
}
```

```shell
$ npm run build
```

## 常用插件汇总

    踩过的坑，流过的泪。

### 查找外部模块

`rollup` 默认是不支持从 `node_modules` 里面查找模块的，比较迷... 使用 [@rollup/plugin-node-resolve](https://www.npmjs.com/package/@rollup/plugin-node-resolve) 可以解决这个问题。

### 兼容 commonjs 模块

很多包都是以 `commonjs` 形式存在，可以用 [@rollup/plugin-commonjs](https://www.npmjs.com/package/@rollup/plugin-commonjs) 来处理。

### 支持引入 json

使用 [@rollup/plugin-json](https://www.npmjs.com/package/@rollup/plugin-json) ，可以支持 `import sender from 'xxx.json'`

### 使用 babel

如果需要使用新特性（一般都会需要吧），官方提供了 [@rollup/plugin-babel](https://www.npmjs.com/package/@rollup/plugin-babel) 来使用 [babel](https://babeljs.io/)，当然 babel 相关的配置需要自己添加：

1. `@babel/core` ，babel 核心文件
2. `@babel/preset-env`，垫片（preset），提供了自动转化语法的能力
    - `core-js` ，如果需要 `polyfill`
    - 以下这部分，如果使用 `typescript` 的话是不需要安装的
    - `@babel/plugin-proposal-class-properties` ，class 的字段相关新特性，比如初始化赋值
    - `@babel/plugin-proposal-decorators` ，使用装饰器
    - `@babel/plugin-proposal-object-rest-spread`，对象展开操作符

这是一个配置例子：

```ts
pluins: [
    // ...
    babelPlugin({
        babelrc: false, // 或者使用独立文件 `.babelrc`
        babelHelpers: 'bundled',
        presets: [
            [
                '@babel/preset-env',
                polyfill
                    ? {
                          useBuiltIns: 'usage',
                          modules: false,
                          corejs: 3
                      }
                    : {}
            ]
        ],
        plugins: useTypescript
            ? []
            : [
                  '@babel/plugin-proposal-object-rest-spread',
                  ['@babel/plugin-proposal-decorators', { legacy: true }],
                  ['@babel/plugin-proposal-class-properties', { loose: true }]
              ],
        include: ['src/**'],
        extensions: [...DEFAULT_EXTENSIONS, 'ts']
    })
];
```

### 使用 typescript

这个是真的坑啊坑，官方提供的 [@rollup/plugin-typescript](https://www.npmjs.com/package/@rollup/plugin-typescript) 的前身是 [rollup-plugin-typescript](https://www.npmjs.com/package/rollup-plugin-typescript)，如果我早知道就不会浪费这么久了。

这个需要额外安装 `tslib` ，而且打包的时候很多坑，生成 `.d.ts` 也有问题。。。 听我的放弃吧。

方案二是使用 babel 的 [@babel/preset-typescript](https://www.npmjs.com/package/@babel/preset-typescript)，但是这个包放弃了类型检查，虽然有提供其它方式去起一个独立的进程来检查类型（貌似 nuxt typescript 的方案也是这种？ ），但依旧麻烦。

另外，还需要安装几个包去支持 `typescript` 有而 `babel` 没有的一些特性，原因是这个包是直接去掉了类型，直接用 babel 编译，速度是上去了很多，但并不是我想要的，有一种脱了裤子放屁的感觉。

最终的方案是 [rollup-plugin-typescript2](https://www.npmjs.com/package/rollup-plugin-typescript2) ，这个是社区提供的一种解决方案，集成了 `tslib`，没有抛弃类型检查，不需要额外安装包（除了 typescript 本身），速度也很快！ 这个包从各个方面碾压了官方提供的 `@rollup/plugin-typescript`（前身是 `rollup-plugin-typescript`，以前就坑过我），不需要犹豫就这个了 😂

### 支持 Vue

需要添加 `rollup-plugin-vue@5.x` ，额外添加依赖 `vue-template-compiler`。

注意，`rollup-plugin-vue` 在 `6.x - beta` 的依赖更换成了 `@vue/compiler-sfc`，但是目前还有些问题，等待正式版出来再看吧。

### 支持 postcss、sass、less、css

使用 [rollup-plugin-postcss](https://www.npmjs.com/package/rollup-plugin-postcss)，支持 `postcss` ，可以额外添加相关 postcss 插件比如 autoprefixer 去实现 css 的 polyfill

这个包还包含了单独打包 css 和压缩的功能，同时还集成了对其它预编译语言的支持，直接安装 `sass` 或者 `less`即可直接使用。

### 开发服务器

使用 [rollup-plugin-serve](https://www.npmjs.com/package/rollup-plugin-serve)，一个 dev server。

### 代码压缩

使用 [rollup-plugin-uglify](https://www.npmjs.com/package/rollup-plugin-uglify)

### 查看打包体积

使用 [rollup-plugin-filesize](https://www.npmjs.com/package/rollup-plugin-filesize)，大概效果是这样：

```shell
    ┌────────────────────────────────────┐
    │                                    │
    │   Destination: dist/mini-mvvm.js   │
    │   Bundle Size:  19.96 KB           │
    │   Minified Size:  19.98 KB         │
    │   Gzipped Size:  6.55 KB           │
    │                                    │
    └────────────────────────────────────┘
```

## Demo

查看 [rollup 配置生成器][@nosaid/rollup]

[@nosaid/rollup]: https://github.com/shalldie/packages/tree/master/packages/%40nosaid/rollup
