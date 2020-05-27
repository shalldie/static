# Virtual DOM 的设计与实现

`Virtual DOM` 本质上来说是 javascript 对象，用来描述 `DOM` 结构以及其附加的`属性、状态、事件`等。

我在学习了 [snabbdom][snabbdom] 源码后，借鉴其思路写了个简化版 [mini-vdom][mini-vdom]，并使用 `mini-vdom` 构建了一个 `MVVM` 库 [mini-mvvm][mini-mvvm]。

写下这篇文章，一方面验证自己的理解，另一方面分享所学。

## 为什么要用 Virtual DOM

目前常见的 React，Vue 等前端框架，在设计上都使用了 `Virtual DOM`（下文中都简称`vdom`），旨在便于管理 dom，提高性能，以及添加跨平台能力。

### 统一管理 dom，提高性能

无需去记住复杂的 dom 操作方式，也不需要关心数据更新后哪些有变更。

`vdom` 封装了这一层，使用者只用更新自己的数据，生成一个新的 `vdom`，它会自己去找到其中差异的部分，进行更新、添加、删除等操作。 对 `dom` 的操作是昂贵的，`vdom` 作为一个缓冲层，使用者可以把自己对 `dom` 的期望表现在 `vdom` 上，最后在一个合适的时机去一次性更新真实 `dom`。

另一方面，提高性能并不是说使用 `vdom` 就比直接操作 `dom` 快。

"越封装越慢"，`vdom` 底层还是调用了普通的操作 dom 的相关 api，这里说的提高性能，说的是可能避免以下情况：

1. 多次操作 dom 后的结果可能跟最初相比没有差异，而如果使用 `vdom` 不会触发更新 dom。
2. 最终的 dom 跟原始 dom 有差异，而 `vdom` 会用最少的次数，尽可能的复用 dom 去达成更新目的以节约消耗，毕竟 dom 的操作非常昂贵。
3. ...想到再加

### 跨平台能力

上来就说过，`vdom` 是对 dom 的一种描述，本质是 javascript 对象，或者编译为其它语言的对象，那么换一种宿主环境，就可以让 `vdom` 在新的平台继续使用，比如去进行 `SSR(Server Side Render)` ，或者很出名的 `React Native`。

## 设想一下 vdom 需要做什么

```

    +-------------------+
    |                   |
    |      template     | 理想状态可以通过模板来生成 Virtual DOM
    |                   | 或者至少是一个 factory
    +---------+---------+
              |
              |
              v
    +---------+---------+       +-------------------+       +-------------------+
    |                   |       |                   |       |                   |
    |    1. VNode       +-----> |      2. diff      +-----> |     3. patch      |
    |                   |       |                   |       |                   |
    +-------------------+       +-------------------+       +-------------------+
    得到 Virtual DOM 对象，       对比新旧 VNode               把 VNode 表示的dom，
    我这里起个名字叫 VNode         看看哪些内容需要去更新          更新到真实 dom 上

```

如上图，核心步骤是 `VNode` => `diff` => `patch`

### 生成 VNode

其中 `VNode`最好是可以通过模板来生成，不过这个应该放在业务端去做，可以看看 [mini-mvvm][mini-mvvm]，我在其中实现了 `Compile` 去编译模板，简化了 `VNode` 的生成，用起来更直观。

作为更底层的 `vdom` 库，应该只用提供方式去生成 `VNode` ，至于如何去优化以便于贴合业务，还是交给业务端吧。

### diff 对比新旧 VNode

每次都会生成一个完整的新的 `VNode` ，拿这个跟旧的做对比，找出其中的差异，以及最优调整方式。

有 3 种情况：

1. 对于相同的部分，保持不变。
2. 不一样，但是可复用。
3. 不一样，不能复用。

对比包含了 `标签类型（tagName）`、`节点属性（attributes）`、`自身状态（props，类似 attributes）`、`事件（events）`，其中 `标签类型（tagName）` 以及后面会提到的辅助字段 `key` 会决定节点是否可以复用。

### patch 更新到 dom 上

根据 diff 对比，把结果反馈到真实 dom 上，一个好的 diff 算法能够节省大量消耗。

---

[snabbdom]: https://github.com/snabbdom/snabbdom
[mini-vdom]: https://github.com/shalldie/mini-mvvm/tree/master/packages/mini-vdom
[mini-mvvm]: https://github.com/shalldie/mini-mvvm
