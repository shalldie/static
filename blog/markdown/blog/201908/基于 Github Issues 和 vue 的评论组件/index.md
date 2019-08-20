# 基于 Github Issues 和 vue 的评论组件

这是一个 vue 评论组件，基于 Github Issues，纯前端，不需要服务端支持。效果见文章底部。

## Github

[vue-git-comment](https://github.com/shalldie/vue-git-comment)

[live demo](https://shalldie.github.io/demos/vue-git-comment/)

## Why make this

> 这个组件的创意和样式，来源与 [gitment](https://github.com/imsun/gitment)。
> 最初博客是用的 `gitment` 作为评论系统，ui 非常喜欢，体积也不大，但是慢慢的暴露了一些问题：

1.  作者自己搭了个服务去转发获取 token，我生怕哪一天...

    这里我用的是 [cros-anywhere](https://cors-anywhere.herokuapp.com) 去转发，
    哪怕有一天 anywhere 也挂了，我既然明白这个问题也能迅速定位。

2.  在移动端上稍微不太友好。
3.  不能倒序。
4.  不少请求都存在缓存，数据更新不及时。
5.  作者很久没维护了，偶尔会遇到一些不能重现的问题。

> [gitalk](https://github.com/gitalk/gitalk) 我也特地去了解了一哈，也是非常优秀的一个项目。但是：

1.  体积蛮大，gzip 后仍然有 60k，这个用了 preact 没办法。
2.  没有分页。
3.  登陆后用的 `graphql` 去查询，这个能省好多流量！

    然后我就要说“但是”了 hh。 实际上测试，这个并不能加快速度。
    graphql 的速度跟 restful 接口的速度差不多，但是会有个 options 请求，也就是说请求时间会 `x2`。
    而 `restful` 有办法可以避免。
    并不是说 `graphql` 不好，只是我需要分页，所以用这个并不是最优解。

> 综上所述，在学习了 2 个项目的部分代码之后，决定自己搞个。

1.  通过一些算法实现倒序分页。
2.  利用一些方式避免了 options 请求，加快速度。
3.  体积不大，对于 vue 项目来说能省不少。
4.  想要更稳定、成熟的方案，建议去用 gitment 和 gitalk 吧。因为他们用的人更多，如果遇到问题也会有更多人可以讨论。

## Install 安装

link:

```html
<script src="lib/vue.js"></script>

<link href="dist/vue-git-comment.css" rel="stylesheet" />
<script src="dist/vue-git-comment.js"></script>
```

npm:

```js
npm install vue-git-comment --save
```

## Usage 使用

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

## Options 参数

评论系统基于 `github api` ， 需要 [去申请](https://github.com/settings/applications/new) 一个 `OAuth application`。

| Name          |   Type   | Required | Description                                |
| :------------ | :------: | :------: | :----------------------------------------- |
| client_id     | `String` |  `true`  | 申请的 client_id                           |
| client_secret | `String` |  `true`  | 申请的 client_secret                       |
| owner         | `String` |  `true`  | issue 所在仓库的所有者                     |
| repo          | `String` |  `true`  | 仓库名称                                   |
| uuid          | `String` |  `true`  | 用于区分文章的唯一标识，每个评论间不能重复 |

## Enjoy it!

\>\_<#@!
