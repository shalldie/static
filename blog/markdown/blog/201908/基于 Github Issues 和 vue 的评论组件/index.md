# 基于 Github Issues 和 vue 的评论组件

<a href="https://www.npmjs.com/package/vue-git-comment"><img class="ignore" src="https://img.shields.io/npm/v/vue-git-comment.svg"></a> <a href="https://travis-ci.org/shalldie/vue-git-comment"><img class="ignore" src="https://img.shields.io/travis/shalldie/vue-git-comment/master.svg"></a> <a href="https://cdn.jsdelivr.net/npm/vue-git-comment@0.0.11/dist/vue-git-comment.umd.min.js"><img class="ignore" src="https://img.badgesize.io/https://cdn.jsdelivr.net/npm/vue-git-comment@0.0.11/dist/vue-git-comment.umd.min.js?compression=gzip"></a>

[vue-git-comment](https://github.com/shalldie/vue-git-comment) ，这是一个基于 `github issues` 和 `vue` 的纯前端评论组件，不需要后端。

效果见文章底部。

## Live Demo

Have a look at [Demo](https://shalldie.github.io/demos/vue-git-comment/)

## Installation

link:

```html
<script src="lib/vue.js"></script>

<link href="dist/vue-git-comment.css" rel="stylesheet" />
<script src="dist/vue-git-comment.umd.min.js"></script>
```

npm:

```js
npm install vue-git-comment --save
```

## Usage

```js
import 'vue-git-comment/dist/vue-git-comment.css';
import VueGitComment from 'vue-git-comment';

// var VueGitComment = window.VueGitComment;  // window
// const VueGitComment = require('VueGitComment'); // commonjs
```

```js
// regist 注册组件

Vue.use(VueGitComment); // global

new Vue({
    el: 'body',
    components: { VueGitComment } // local
});
```

```js
<template>
    <vue-git-comment :options="options" />
</template>

<script>
export default {
    data() {
        return {
            options: {
                client_id: 'client_id',
                client_secret: 'client_secret',
                owner: '仓库所有者',
                repo: '仓库名称',
                uuid: '唯一标识，用于区分不同文章'
            }
        };
    }
};
</script>
```

## Options

评论系统基于 `github api` ， 需要 [去申请](https://github.com/settings/applications/new) 一个 `OAuth application`。

| Name          |   Type   | Required | Description                                   |
| :------------ | :------: | :------: | :-------------------------------------------- |
| client_id     | `String` |  `true`  | 申请的 client_id                              |
| client_secret | `String` |  `true`  | 申请的 client_secret                          |
| owner         | `String` |  `true`  | issue 所在仓库的所有者                        |
| repo          | `String` |  `true`  | 仓库名称                                      |
| uuid          | `String` |  `true`  | 用于区分文章的唯一标识，每个评论间不能重复    |
| title         | `String` | `false`  | issue 使用的标题，选填。 默认使用当前页面标题 |

## Similar Project

同类作品有： [gitment](https://github.com/imsun/gitment) 、 [gitalk](https://github.com/gitalk/gitalk)

## Why make this ?

    Q：已经有2个类似的了，为啥还要再弄个轮子呢？

最开始我用的是 gitment ，蛮好的，ui 也非常喜欢，我的这个项目在 ui 方面也是参考了 gitment，体积也不大，赞。
但是慢慢找到如下缺点：

    1.  作者自己搭了个服务去转发获取 token，我生怕哪一天...

        这里我用的是 [cros-anywhere](https://cors-anywhere.herokuapp.com) 去转发，
        哪怕有一天 anywhere 也挂了，我既然明白这个问题也能迅速定位。

    2.  在移动端上稍微不太友好。
    3.  不能倒序。
    4.  不少请求都存在缓存，数据更新不及时。
    5.  作者很久没有维护了。

gitalk 我也特地去了解了一哈，也是非常优秀的一个项目。但是，

    1.  体积蛮大，gzip 后 60k，这个用了 preact 没办法。
    2.  没有分页。
    3.  登陆后用的 `graphql` 去查询，这个能省好多流量。但是实际速度并没有提升。

综上所述，在学习了 2 个项目的部分代码之后，决定自己搞个。

    1.  通过一些算法实现倒序分页。
    2.  利用一些方式避免了 options 请求，加快速度。
    3.  体积不大，对于 vue 项目来说能省不少。
    4.  想要更稳定、成熟的方案，建议去用 gitment 或 gitalk。

## Enjoy it! >\_<#@!
