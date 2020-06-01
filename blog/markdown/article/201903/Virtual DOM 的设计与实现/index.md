# Virtual DOM 的设计与实现

目前流行的一些前端框架，比如 `React` 和 `Vue`，都是用了 `Virtual DOM` 作为数据和真实DOM之间的一层缓冲，并不是直接更新 `dom`。`Virtual DOM` 本质上来说是 javascript 对象，用来描述 `DOM` 结构以及其附加的`属性、状态、事件`等。

我在学习了 [snabbdom][snabbdom] 源码后，借鉴其思路写了个简化版 [mini-vdom][mini-vdom]，并使用 `mini-vdom` 构建了一个 `MVVM` 库 [mini-mvvm][mini-mvvm]。之所以选择 `snabbdom` ，是因为在比较了一些市面上的 `vdom` 库，发现 `snabbdom` 实现尤为巧妙，插件机制可以很方面的组合自己所需。另外就是 `Vue` 也是魔改了 `snabbdom` 作为自己 `vdom` 的底层部分，因此有极大的说服力。

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

```shell

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

对比包含了 `标签类型（tagName）`、`节点属性（attributes）`、`自身状态（props，不同于 attributes）`、`事件（events）`，其中 `标签类型（tagName）` 以及后面会提到的辅助字段 `key` 会决定节点是否可以复用。

### patch 更新到 dom 上

根据 diff 对比，把结果反馈到真实 dom 上，一个好的 diff 算法能够节省大量消耗。

## 目录结构概览

需求有了，就需要划分模块去实现各步骤。这是我整理的项目目录结构。

```shell
├── dev.scss             # 开发阶段所用样式
├── dev.ts               # 开发阶段打包入口
├── index.ts             # 生产环境打包入口
├── lib
│   ├── VNode.ts         # VNode 模块
│   ├── h.ts             # VNode 的工厂方法
│   ├── hooks.ts         # 为 vdom 提供生命周期的 hook
│   ├── modules          # plugins 目录，VNode 所拥有的各项能力
│   │   ├── attrs.ts
│   │   ├── events.ts
│   │   └── props.ts
│   └── patch.ts         # 把 VNode 挂载到真实 dom
└── utils                # 工具包
    └── index.ts
```

## VNode 的设计

VNode 是 `vdom` 库对真实dom描述的最小单元。当 VNode 按照一定的结构组合起来，再添加上更新真实dom的能力，就是一个完整的 `vdom` 库。

### VNode 类

```ts
class VNode {
    key: string;
    type: string;
    data: IVNodeData;
    children?: VNode[];
    text?: string;
    elm?: Element;
    constructor(type: string, data?: IVNodeData, children?: VNode[], text?: string, elm?: Element);
    /**
     * 是否是 VNode
     *
     * @static
     * @param {*} node 要判断的对象
     * @returns {boolean}
     * @memberof VNode
     */
    static isVNode(node: any): boolean;
    /**
     * 是否是可复用的 VNode 对象
     * 判断依据是 key 跟 tagname 是否相同，既 对于相同类型dom元素尽可能复用
     *
     * @static
     * @param {VNode} oldVnode
     * @param {VNode} vnode
     * @returns {boolean}
     * @memberof VNode
     */
    static isSameVNode(oldVnode: VNode, vnode: VNode): boolean;
}

export interface IVNodeData {
    key?: string;

    props?: IProps;

    attrs?: IAttrs;

    on?: IListener;

    hook?: IVnodeHook;

    ns?: string;
}
```

- `key` 是 VNode 在同一父节点下的唯一标识，主要用给业务层来决定是否复用dom。
- `type` 表示 `tagName`，表示节点的 tag 类型。
- `data` 是 `IVNodeData` 类型，包含了 节点属性、节点状态、事件 等信息。
- `children` 表示子节点数组，对应了真实dom中的 `childNodes`
- `text` 表示 `textContent`
- `elm` 对应了真实 dom 元素
- `isVNode` 和 `isSameVNode` 是 VNode 相关的静态方法，作用见注释

### h，生成 VNode 的工厂

这么多属性，如果自己去一个一个new，大概会被烦死吧，，，因此额外提供一个 `h` 方法，用于快速，便捷的生成 `VNode`。

```ts
function h(type: string, text?: string): VNode;
function h(type: string, children?: VNode[]): VNode;
function h(type: string, data?: IVNodeData, text?: string): VNode;
function h(type: string, data?: IVNodeData, children?: VNode[]): VNode;
```

乍一看好像提升效率并不太高，很多东西还是要自己写。但是这里的 `type` 并不是单纯的指标签类型，实际上是 [emmet][emmet] 语法（不包含层级选择）：

1. `div` ，常规的 tagName
2. `div#app`，包含了 `id`
3. `div.some-class.sec-class` ，包含了若干 `class`
4. `a[href=www.baidu.com][target=_blank]` ，包含了若干 `attribute`
5. `div#app.some-class[data-hello=world]`， 可以把上面这些任意组合起来！

使用这些重载可以节省很多很多代码，只要用一个又臭又长的字符串，就可以表示出一个特别复杂的结构了 >_<#@! ，其中的实现主要是用了正则表达式，感兴趣可以去 [mini-vdom][mini-vdom] 查看具体实现，或者参考我另一篇文章 [javascript 中的正则表达式][regex-in-javascript]，这里不赘述。

### 以插件的形式为 VNode 注入能力

[snabbdom][snabbdom] 在这部分的设计中，把 `VNode` 各项能力抽象成一种插件，并没有完全集成在自身的lib中。我之前看到这一步说实话挺惊奇，这样就为业务层提供了更多的定制化能力。

作为插件的意思是，在设计的过程中，插件并不是跟lib强耦合，大家都遵循同一套接口（比如初始化方式，生命周期等），然后打包的时候需要哪个再加哪个。

这部分位于 `modules` 目录下，包含了 `attrs`、`events`、`props` 三部分，对应了节点的 属性、事件、自身状态。各部分根据自身情况去注册这些接口：

```ts
export type TModuleHookFunc = (oldVnode: VNode, vnode: VNode) => void;

export interface IModuleHook {
    create?: TModuleHookFunc;

    insert?: TModuleHookFunc;

    update?: TModuleHookFunc;

    destroy?: TModuleHookFunc;
}

```

以 `attrs` 为例，这部分模块负责处理节点的属性：

```ts
export function updateAttrs(oldVnode: VNode, vnode: VNode): void {
    let oldAttrs = oldVnode.data.attrs;
    let attrs = vnode.data.attrs;
    const elm = vnode.elm;

    // 两个vnode都不存在 attrs
    if (!oldAttrs && !attrs) return;
    // 两个 attrs 是相同的
    if (oldAttrs === attrs) return;

    oldAttrs = oldAttrs || {};
    attrs = attrs || {};

    // 更新 attrs
    for (const key in attrs) {
        const cur = attrs[key];
        const old = oldAttrs[key];
        // 相同就跳过
        if (cur === old) continue;
        // 不同就更新
        elm.setAttribute(key, cur + '');
    }

    // 对于 oldAttrs 中有，而 attrs 没有的项，去掉
    for (const key in oldAttrs) {
        if (!(key in attrs)) {
            elm.removeAttribute(key);
        }
    }
}

export const attrsModule: IModuleHook = {
    create: updateAttrs,
    update: updateAttrs
};
```

`attrs` 在 创建、更新 两个阶段会触发模块的处理函数，其它没用到的地方不用加，对应的hook会在 `vdom` 更新的对应生命周期去执行。

## diff 和 patch

之所以把diff和patch放在一起，是因为虽然从逻辑上来看是两个步骤，但实际上是一个整体。 因为 diff 是在 patch 的过程中进行。

第一次 patch，是 `VNode` 跟空的根dom进行对比，所有的dom都是新增。

之后的 patch 属于 `update`，是新旧 `VNode` 对比，对于不可复用的删除，可复用的更新，新增的部分插入。

### 对比某个节点在更新前后的差异

先说一个节点的情况，因为 dom 和 `VNode` 是一个树状结构，我们在进行 diff 的时候，是从根节点开始进行递归。

    注释节点在本篇文章中会忽略掉。

```shell
----------------------------------------------------
    # 1. 前后没有差异，直接返回

----------------------------------------------------
    # 2. 两者都是文本节点，则更新 `textContent`

          XX                            XX
         X  X        +------->         X  X
        X    X                        X    X
       X+----+X      +------->       X+----+X
      X        X                    X        X
     X          X                  X          X

----------------------------------------------------
    # 3. 新旧节点都有 children，属于容器节点，则去对比他们 children

    +----------+                  +----------+
    |          |     +------->    |          |
    |          |                  |          |
    |          |     +------->    |          |
    |          |                  |          |
    +----------+                  +----------+

----------------------------------------------------
    # 4. 新节点是容器节点，旧的是文本节点

         XX                        +----------+
        X  X        +------->      |          |
       X    X                      |          |
      X+----+X      +------->      |          |
     X        X                    |          |
    X          X                   +----------+

----------------------------------------------------
    # 5. 新节点是文本节点，旧的是容器节点

    +----------+                        XX
    |          |     +------->         X  X
    |          |                      X    X
    |          |     +------->       X+----+X
    |          |                    X        X
    +----------+                   X          X

----------------------------------------------------
```


    节点的 新增、删除、更新 等操作，都会触发相应的hook（上文提到的`module`目录下声明的各项能力）

1. 前后没有差异，直接返回
2. 两者都是文本节点，则更新 `textContent`
3. 新旧节点都有 children，属于容器节点，则去对比他们 children
4. 新节点是容器节点，旧的是文本节点
5. 新节点是文本节点，旧的是容器节点

---

[snabbdom]: https://github.com/snabbdom/snabbdom
[mini-vdom]: https://github.com/shalldie/mini-mvvm/tree/master/packages/mini-vdom
[mini-mvvm]: https://github.com/shalldie/mini-mvvm
[emmet]: https://docs.emmet.io/
[regex-in-javascript]: regex-in-javascript
