# Virtual DOM 的设计与实现

目前流行的一些前端框架，比如 `React` 和 `Vue`，都是用了 `Virtual DOM` 作为数据和真实 DOM 之间的一层缓冲，并不是直接更新 `dom`。`Virtual DOM` 本质上来说是 javascript 对象，用来描述 `DOM` 结构以及其附加的`属性、状态、事件`等。

我在学习了 [snabbdom][snabbdom] 源码后，借鉴其思路写了个简化版 [mini-vdom][mini-vdom]，并使用 `mini-vdom` 构建了一个 `MVVM` 库 [mini-mvvm][mini-mvvm]。之所以选择 `snabbdom` ，是因为在比较了一些市面上的 `vdom` 库，发现 `snabbdom` 实现尤为巧妙，插件机制可以很方面的组合自己所需。另外就是 `Vue` 也是魔改了 `snabbdom` 作为自己 `vdom` 的底层部分，因此有极大的说服力。

写下这篇文章，一方面验证自己的理解，另一方面分享所学。

## 为什么要用 Virtual DOM

> 目前常见的 React，Vue 等前端框架，在设计上都使用了 `Virtual DOM`（下文中都简称`vdom`），旨在便于管理 dom，提高性能，以及添加跨平台能力。

### 统一管理 dom，提高性能

> 无需去记住复杂的 dom 操作方式，也不需要关心数据更新后哪些有变更。

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

> 如上图，核心步骤是 `VNode` => `diff` => `patch`

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

> VNode 是 `vdom` 库对真实 dom 描述的最小单元。当 VNode 按照一定的结构组合起来，再添加上更新真实 dom 的能力，就是一个完整的 `vdom` 库。

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

-   `key` 是 VNode 在同一父节点下的唯一标识，主要用给业务层来决定是否复用 dom。
-   `type` 表示 `tagName`，表示节点的 tag 类型。
-   `data` 是 `IVNodeData` 类型，包含了 节点属性、节点状态、事件 等信息。
-   `children` 表示子节点数组，对应了真实 dom 中的 `childNodes`
-   `text` 表示 `textContent`
-   `elm` 对应了真实 dom 元素
-   `isVNode` 和 `isSameVNode` 是 VNode 相关的静态方法，作用见注释

### h，生成 VNode 的工厂

这么多属性，如果自己去一个一个 new，大概会被烦死吧，，，因此额外提供一个 `h` 方法，用于快速，便捷的生成 `VNode`。

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

使用这些重载可以节省很多很多代码，只要用一个又臭又长的字符串，就可以表示出一个特别复杂的结构了 >\_<#@! ，其中的实现主要是用了正则表达式，感兴趣可以去 [mini-vdom][mini-vdom] 查看具体实现，或者参考我另一篇文章 [javascript 中的正则表达式][regex-in-javascript]，这里不赘述。

### 以插件的形式为 VNode 注入能力

[snabbdom][snabbdom] 在这部分的设计中，把 `VNode` 各项能力抽象成一种插件，并没有完全集成在自身的 lib 中。我之前看到这一步说实话挺惊奇，这样就为业务层提供了更多的定制化能力。

作为插件的意思是，在设计的过程中，插件并不是跟 lib 强耦合，大家都遵循同一套接口（比如初始化方式，生命周期等），然后打包的时候需要哪个再加哪个。

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

`attrs` 在 创建、更新 两个阶段会触发模块的处理函数，其它没用到的地方不用加，对应的 hook 会在 `vdom` 更新的对应生命周期去执行。

## diff 和 patch

> 之所以把 diff 和 patch 放在一起，是因为虽然从逻辑上来看是两个步骤，但实际上是一个整体。 因为 diff 是在 patch 的过程中进行。

第一次 patch，是 `VNode` 跟空的根 dom 进行对比，所有的 dom 都是新增。

之后的 patch 属于 `update`，是新旧 `VNode` 对比，对于不可复用的删除，可复用的更新，新增的部分插入。

### 对比单节点在更新前后的差异

使用 `patchVNode` 来更新一个节点。 dom 和 `VNode` 是一个树状结构，我们在进行 diff 的时候，是从根节点开始进行递归。

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
    # 3. 新旧节点都有 children，属于容器节点，则去对比他们 children，执行 `updateChildren`

    +----------+                  +----------+
    |          |     +------->    |          |
    |          |                  |          |
    |          |     +------->    |          |
    |          |                  |          |
    +----------+                  +----------+

----------------------------------------------------
    # 新节点是容器节点，旧的是文本节点。删除文本，添加新节点。

         XX                        +----------+
        X  X        +------->      |          |
       X    X                      |          |
      X+----+X      +------->      |          |
     X        X                    |          |
    X          X                   +----------+

----------------------------------------------------
    # 新节点是文本节点，旧的是容器节点。删除容器节点，添加文本节点。

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
3. 新旧节点都有 children，属于容器节点，则去对比他们 children，执行 `updateChildren`
4. 新节点是容器节点，旧的是文本节点。删除文本，添加新节点。
5. 新节点是文本节点，旧的是容器节点。删除容器节点，添加文本节点。

特地画了个图来帮助描述，，，这个就是更新某个节点部分的逻辑，不上代码占位置了。

### diff 算法

上面说的是更新某一个节点，更新节点的直接子节点使用的是 `updateChildren` ，一般说的 `diff算法` 就指的是这块。一个好的 `diff算法` 可以在很大程度上决定一个 `vdom` 库的优劣。

我们循序渐进看一下：

#### 批量全更新

```ts
// 方式一：
// 如果想无脑点可以直接这样，不复用dom，直接把所有children都更新
removeVnodes(parentElm, oldChildren);
addVnodes(parentElm, null, children);
```

不需要去考虑如何复用节点，直接全删掉重新生成。

优点是简单，直观，这个是我写的烦的时候，一怒之下的作品 QAQ 。

#### 复用元素

如何决定一个元素是否可复用？ 上面 VNode 那里的实现有个 isSameVNode 静态方法，判断的依据很简单：

    当 tagName 和 key 都相同的时候，这个元素就可以复用

`tagName` 自不必说，如果节点类型都不一样，当然不能复用。至于 `key`，是交给业务端去添加，因为一些 dom 可能有些脏状态，比如用户自己添加的，或者自身就带有（比如 `input:text` 有 `value`，`input:checkbox` 有 `checked` 等）。

`Vue` 中对 `key` 有这么一段描述：

---

key 的特殊 attribute 主要用在 Vue 的虚拟 DOM 算法，在新旧 nodes 对比时辨识 VNodes。如果不使用 key，Vue 会使用一种最大限度减少动态元素并且尽可能的尝试就地修改/复用相同类型元素的算法。而使用 key 时，它会基于 key 的变化重新排列元素顺序，并且会移除 key 不存在的元素。

---

下面这个算法，可以了解到 key 对 diff 算法的影响。

#### 一个简单的 diff 算法

明白了复用元素的规则，我第一时间就想到了这个算法：从上到下依次循环呗。

1. 循环目标 children，找到能复用的节点，就移动到当前位置。
2. 没找到能复用的节点，就自己生成一个。
3. 循环完毕后，把多余的节点删除，这些是不能复用的部分。

```ts
const oldMirror = oldChildren.slice(); // 用来表示哪些oldchildren被用过，位置信息等
for (let i = 0; i < children.length; i++) {
    // 当前vnode
    const vnode = children[i];
    // 可以被复用的vnode的索引
    const oldVnodeIndex = oldMirror.findIndex(node => {
        return node && VNode.isSameVNode(node, vnode);
    });
    // 如果有vnode可以复用
    if (~oldVnodeIndex) {
        // console.log(oldVnodeIndex);
        const oldVnode = oldMirror[oldVnodeIndex];

        // 把之前的置空，表示已经用过。之后仍然存留的要被删除
        oldMirror[oldVnodeIndex] = undefined;
        // 调整顺序（如果旧的索引对不上新索引）
        if (oldVnodeIndex !== i) {
            parentElm.insertBefore(oldVnode.elm, parentElm.childNodes[i + 1]);
        }
        // 比较数据,进行更新
        // eslint-disable-next-line
        patchVNode(oldVnode, vnode);
    }
    // 不能复用就创建新的
    else {
        addVnodes(parentElm, parentElm.childNodes[i + 1], [vnode]);
    }
}

// 删除oldchildren中未被复用的部分
const rmVnodes = oldMirror.filter(n => !!n);

rmVnodes.length && removeVnodes(parentElm, rmVnodes);
```

这个算法非常简单，直观，有效。在对列表进行 `修改`，`添加` 操作的时候，表现的非常高效，可读性也不错，易理解。

但是缺点也很明显：如果对列表非尾部的地方，进行 `插入`，`删除` 操作，这时候最佳方式应该就是直接进行 `插入` 或 `删除`，而这个算法会从上到下依次进行没必要的复用。虽然添加 `key` 可以一定程度上解决半个问题，避免在 `插入` 时候的复用，但是不能指望用户里面没有白痴或者懒鬼，所以还是有改善的空间。

## 更完善的 diff 算法

> 这个算法的思路来自 [snabbdom][snabbdom]，在实现上有差异，我把它简化了（可能损失了一些微小的性能？）。

据我了解也是业内相对更通用的 diff 实现，各 `vdom` 库已经趋于一致。虽然有更优的算法可以在一些更复杂的情况减少 dom 操作，但是复杂度就上去了。大概大部分人觉得，下面的这种实现，可以让 `可读性`，`效率` 达到可接受的平衡态吧。

### 概述

上面那个简单的 diff 算法，是从左到右（从上到下）依次做对比，可以满足 `尾部插入`，`尾部删除` 操作，但是对于 `非尾部插入`，`非尾部删除` 就力不从心，所以新的算法需要弥补这点。

    除了从左到右，再加一种从右到左。 从两端向中间依次进行对比。

```shell
    oldStartIndex                                 oldEndIndex
          +                                           +
          |                                           |
          v                                           v
      +---+---+  +-------+  +-------+  +-------+  +---+---+
      |       |  |       |  |       |  |       |  |       |
old:  |       |  |       |  |       |  |       |  |       |
      |       |  |       |  |       |  |       |  |       |
      +-------+  +-------+  +-------+  +-------+  +-------+

      +-------+  +-------+  +-------+  +-------+  +-------+
      |       |  |       |  |       |  |       |  |       |
new:  |       |  |       |  |       |  |       |  |       |
      |       |  |       |  |       |  |       |  |       |
      +---+---+  +-------+  +-------+  +-------+  +---+---+
          ^                                           ^
          |                                           |
          +                                           +
    newStartIndex                                 newEndIndex
```

原理听起来就是这么简单。但是实现上挺麻烦，这些步骤需要耐心看下去。

假设有 4 个索引，分别是：

-   `oldStartIndex`，指向 oldChildren 左边遍历到的节点
-   `oldEndIndex`，指向 oldChildren 右边遍历到的节点
-   `newStartIndex`，指向 newChildren 左边遍历到的节点
-   `newEndIndex`，指向 newChildren 左边遍历到的节点

```ts
while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    switch (true) {
    }
}
```

不断重复以下对比过程，直到两个数组中任一组的头指针超过尾指针，循环结束。

### 校验当前指向的节点是否可用

```ts
    // 1. 先校验2个 old start/end vnode 是否为空，当为`undefined`的时候，表示被其它地方复用了
    // 对 new start/end vnode 也做处理，是因为可能移动后根本没子节点
    case !oldStartVNode:
        oldStartVNode = oldChildren[++oldStartIndex];
        break;
    case !oldEndVNode:
        oldEndVNode = oldChildren[--oldEndIndex];
        break;
    case !newStartVNode:
        newStartVNode = children[++newStartIndex];
        break;
    case !newEndVNode:
        newEndVNode = oldChildren[--newEndIndex];
        break;
```

对于 `oldChildren` 来说，如果某个节点被复用，可以把它赋值 `undefined` 作为标记，因此当指向的节点为空时，需要移动指针到下一个。即 `oldStartIndex` 向右，或 `oldEndIndex` 向左。

`newChildren` 也需要添加判断，因为可能新的 children 长度为 0。

### 首首对比、尾尾对比

```ts
    // 2. 首首、尾尾 对比， 适用于 普通的 插入、删除 节点
    // 首首比较
    case VNode.isSameVNode(oldStartVNode, newStartVNode):
        patchVNode(oldStartVNode, newStartVNode);
        oldStartVNode = oldChildren[++oldStartIndex];
        newStartVNode = children[++newStartIndex];
        break;

    // 尾尾比较
    case VNode.isSameVNode(oldEndVNode, newEndVNode):
        patchVNode(oldEndVNode, newEndVNode);
        oldEndVNode = oldChildren[--oldEndIndex];
        newEndVNode = children[--newEndIndex];
        break;
```

`首首对比` 好说，跟上面那个简单 diff 一样从左往右判断。但是如果用户的行为是向列表首部添加一项，那么继续从左往右就会浪费很多计算量。

在 `首首对比` 失败后，再进行 `尾尾对比`，从右向左判断，这样就适用于普通任意位置的 插入、删除 节点。

### 首尾交叉对比

```ts
    // 3. 旧尾=》新头，旧头=》新尾， 适用于移动了某个节点的情况
    // 旧尾=》新头，把节点左移
    //    [1, 2, 3]
    // [3, 1, 2]
    case VNode.isSameVNode(oldEndVNode, newStartVNode):
        parentElm.insertBefore(oldEndVNode.elm, parentElm.childNodes[newStartIndex]);
        patchVNode(oldEndVNode, newStartVNode);
        oldEndVNode = oldChildren[--oldEndIndex];
        newStartVNode = children[++newStartIndex];
        break;

    // 旧头=》新尾，把节点右移
    // [1, 2, 3]
    //    [2, 3, 1]
    case VNode.isSameVNode(oldStartVNode, newEndVNode):
        parentElm.insertBefore(oldEndVNode.elm, oldEndVNode.elm.nextSibling);
        patchVNode(oldStartVNode, newEndVNode);
        oldStartVNode = oldChildren[++oldStartIndex];
        newEndVNode = children[--newEndIndex];
        break;
```

`首尾交叉对比` 是交叉对比的一部分，其实跳过这里到下一步也没问题。但是如果添加了这种判断，就为 `移动了某个节点` 的情况避免了计算消耗，会更快。

1. `旧尾` 跟 `新头` 对比，适用于节点左移的情况

```shell
# example，3 移动到了左边
old:     [1, 2, 3]
new:  [3, 1, 2]
```

2. `旧头` 跟 `新尾` 对比，适用于节点右移的情况

```shell
# example，1 移动到了右边
old:  [1, 2, 3]
new:     [2, 3, 1]
```

### 交叉对比剩余部分

```ts
    // 4. 交叉对比剩余部分
    default:
        // 可以被复用的vnode的索引
        const oldVnodeIndex = oldChildren.findIndex((node, index) => {
            return (
                // 索引在 oldStartIndex ~ oldEndIndex
                // 之前没有被复用过
                //  并且可以被复用
                index >= oldStartIndex &&
                index <= oldEndIndex &&
                node &&
                VNode.isSameVNode(node, newStartVNode)
            );
        });
        // 如果有vnode可以复用
        if (~oldVnodeIndex) {
            const oldVnode = oldChildren[oldVnodeIndex];

            // 把之前的置空，表示已经用过。之后仍然存留的要被删除
            oldChildren[oldVnodeIndex] = undefined;
            // 调整顺序（如果旧的索引对不上新索引）
            if (oldVnodeIndex !== newStartIndex) {
                parentElm.insertBefore(oldVnode.elm, parentElm.childNodes[newStartIndex]);
            }
            // 比较数据,进行更新
            patchVNode(oldVnode, newStartVNode);
        }
        // 不能复用就创建新的
        // old: [1,    2, 3,    4]
        // new: [1, 5, 2, 3, 6, 4]
        else {
            addVnodes(parentElm, parentElm.childNodes[newStartIndex], [newStartVNode]);
        }

        // 新头 向右移动一位
        newStartVNode = children[++newStartIndex];
        break;
```

-   `oldChildren` 中俩指针中间的部分，属于没被复用的部分。
-   `newChildren` 中俩指针中间的部分，目前没能够找到可复用节点。

对于 `newChildren` 的剩余部分，依次从 `oldChildren` 的剩余部分中去找可复用的节点，如果没找到，就生成一个新的去填充，`oldChildren` 里面如果某一项被复用，就给这个索引位置赋值 `undefined` 作为标记，下次循环直接跳过。

### 善后工作

```ts
// 如果循环完毕，还有 oldStartIndex ～ oldEndIndex || newStartIndex ～ newEndIndex 之间还有空余，
// 表示有旧节点未被删除干净，或者新节点没有完全添加完毕

// 旧的 vnodes 遍历完，新的没有
// 表示有新的没有添加完毕
if (oldStartIndex > oldEndIndex && newStartIndex <= newEndIndex) {
    addVnodes(parentElm, children[newEndIndex + 1]?.elm, children.slice(newStartIndex, newEndIndex + 1));
}
// 新的 vnodes 遍历完，旧的没有
// 表示有旧的没有删除干净
else if (oldStartIndex <= oldEndIndex && newStartIndex > newEndIndex) {
    removeVnodes(
        parentElm,
        oldChildren.slice(oldStartIndex, oldEndIndex + 1).filter(n => !!n)
    );
}
```

这时候有 2 种情况需要处理一下：

-   `oldChildren` 遍历完， `newChildren` 没有。 表示旧节点都被复用了，还有部分新节点要重新生成。
-   `newChildren` 遍历完， `oldChildren` 没有。 表示新节点都已经生成完毕，旧节点中有一部分没用上，都需要删除。

## 相关链接

[snabbdom][snabbdom] <br>
[A mini virtual dom lib. 一个轻量级的虚拟 dom 库][mini-vdom] <br>
[基于 virtual dom - mini-vdom 的轻量级 mvvm 库][mini-mvvm] <br>
[emmet][emmet] <br>
[javascript 中的正则表达式][regex-in-javascript]

[snabbdom]: https://github.com/snabbdom/snabbdom
[mini-vdom]: https://github.com/shalldie/mini-mvvm/tree/master/packages/mini-vdom
[mini-mvvm]: https://github.com/shalldie/mini-mvvm
[emmet]: https://docs.emmet.io/
[regex-in-javascript]: regex-in-javascript
