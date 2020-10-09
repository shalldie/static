# 前端 MVVM 库的设计与实现

在工作学习的过程中，看到某个事物经常有 “如果我来做，会怎么做” 的想法，因此走了挺多弯路，但是通过实践也有一些收获。

从最初接触 mvvm 框架到现在，陆续写过一些实现，比如一个 [不包含 `虚拟dom` 的版本][mini-mvvm-novdom]，包含 `虚拟dom` 的版本：[mini-mvvm][mini-mvvm]。

验证所学，分享所得。

## 文章实现 mvvm 库拥有的能力

这部分写到前面，api 大部分参照的 vue 语法，本文会逐步阐述各个功能的实现。

-   [x] VNode 基于虚拟 dom： [virtual dom - mini-vdom][mini-vdom]
-   [x] 数据监听
    -   [x] `data`、`computed` 变动监听
    -   [x] 数组方法监听 `push` | `pop` | `shift` | `unshift` | `splice` | `sort` | `reverse`
-   [x] `computed` 计算属性
-   [x] `文本节点` 数据绑定，可以是一段表达式
-   [x] `attribute` 数据绑定
    -   [x] 支持绑定 data、computed，支持方法，可以是一段表达式
-   [x] 常用指令
    -   [x] `m-model` 双向绑定。 支持 `input`、`textarea`、`select`
    -   [x] `m-if` 条件渲染。条件支持 `data`、`computed`、一段表达式
    -   [x] `m-for` 循环。`(item,index) in array`、`item in array`
-   [x] 事件绑定
    -   [x] `@click` | `@mousedown` | `...` 。可以使用 `$event` 占位原生事件
-   [x] `watch` 数据监听，详见下方示例
    -   [x] 声明方式
    -   [x] api 方式
-   [x] 生命周期
    -   [x] `created` 组件创建成功，可以使用 `this` 得到 MVVM 的实例
    -   [x] `beforeMount` 将要被插入 dom
    -   [x] `mounted` 组件被添加到 dom，可以使用 `this.$el` 获取根节点 dom
    -   [x] `beforeUpdate` 组件将要更新
    -   [x] `updated` 组件更新完毕

## 化简为繁

一下子实现一个复杂的功能让人却步，我们可以先从一个低层次的东西一步一步迭代到我们想要的。

用户用一个 mvvm 库的时候往往很简单：

```bash
# 1.声明模板；
# 2.改变数据；
# 3.页面更新。

+-----------------+   +-----------------+   +-----------------+
|                 |   |                 |   |                 |
| state template  +-> |   data change   +-> |      update     |
|                 |   |                 |   |                 |
+-----------------+   +-----------------+   +-----------------+
```

每个步骤内部都有很多额外工作
```
+-----------------+                 +-----------------+
|                 |     compile     |                 |
|     template    |  +----------->  | render function |
|                 |                 |                 |
+-----------------+                 +-----------------+

                                     render function 包含了：
                                     常用指令：m-model、m-if、m-for
                                     事件： @click、@mousedown ...
```

此时数据改变后，需要我们手动进行 render，用着不太方便也不高端，那么再加一层。


```

+-----------------------------------------------------------------+
| +-----------------+                 +-----------------+         |
| |                 |     compile     |                 |         |
| |     template    |  +----------->  | render function |         |
| |                 |                 |                 |         |
| +-----------------+                 +-----------------+         |
|                                                                 |
|                                      render function 包含了：       |
|                                      常用指令：m-model、m-if、m-for    |
|                                      事件： @click、@mousedown ...  |
+-----------------------------------------------------------------+
```

## 相关链接

[snabbdom][snabbdom]
[A mini virtual dom lib. 一个轻量级的虚拟 dom 库][mini-vdom]
[基于 virtual dom - mini-vdom 的轻量级 mvvm 库][mini-mvvm]

[snabbdom]: https://github.com/snabbdom/snabbdom
[mini-vdom]: https://github.com/shalldie/mini-mvvm/tree/master/packages/mini-vdom
[mini-mvvm]: https://github.com/shalldie/mini-mvvm
[mini-mvvm-novdom]: https://github.com/shalldie/mini-mvvm/tree/no-vdom
