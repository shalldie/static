# Service - 业务与 UI 分离

> 业务逻辑与 UI 分离，在服务端人士看来一般理所当然，似乎事情本来就应该这样。
> 但是在前端领域延伸出了另一条路：`UI组件` 和 `业务组件`。

-   `UI组件`（基础组件） 负责提供基础展示、交互能力，拥有极大的复用性。
-   `业务组件` 在 `UI组件` 的基础上，添加了定制化的展示，以及业务逻辑。通常很难复用。

业务会分散到多个、甚至多层次的组件中去，在业务复杂后应该还要找一个 `store` 来完成状态管理。
随着时间增加，UI 逻辑和业务逻辑纠缠不清，出现了 _跨层级传值_、_兄弟组件间传值_、_调用不相干组件间方法_ 等奇葩需求。

就像这样，点击一个删除按钮后，想让【List】执行 refresh 方法：

```
                                        ...

                                         ▲
  ┌──────────┐      ┌────────────┐       │             ┌────────────┐
  │          │      │            ├───────┘             │            │
  │          ├─────►│   Header   ├─────► ...  ────────►│   Delele   │
  │          │      └────────────┘                     └──────┬─────┘
  │          │                                                │
  │   Page   │      ┌────────────┐                            │
  │          │      │            │                            │
  │          ├─────►│    List    │◄─────── refresh ◄──────────┘
  │          │      │            │
  └──────────┘      └────────────┘

```

## 常规的解决方案

为此前端延伸出一系列解决方案和概念，`状态管理`、`EventBus`、`单向数据流`、`时间旅行`、`balabala`...
甚至 redux 已经出现了辅助生成 `Action Type` 的库，这类为了解决问题而引入了新问题，让前端异常繁荣。

`EventBus` 是 pub/sub 模式下的产物，应用广泛，可靠而有效。缺点就是用起来很丑陋，很难接受 `EventKey` 使用字面量，引入常量也没有很大程度解决问题，反而会带来一些成本。如果未能妥善释放也会给内存造成很大的压力。

`类flux状态管理` 推崇的是集中管理状态，可以用一个状态，概括一组组件，甚至一个应用的整体状态。
因此它是全局的，不适合 ui 组件，也不好解决内存持久不能释放等问题。

> 概括起来就是，我对现有方法有意见，觉得他们用起来很麻烦，也不能解决问题，还会带来新的问题。

## 业务与 UI 分离

业务如果拆分到太多组件中去，那么除了写这部分代码的人，很难对整个业务有个直观的感受，不清楚这个业务是做什么的，
如果想对现有业务进行调整，也有可能影响业务中，某个自己不熟悉的部分。另外跨多层级传递数据、调用方法会非常麻烦。

> 我的想法是，把业务与 UI 分离，业务本身就不应该写到组件中去，业务有自己的 `数据`、`方法`，就像传统架构中的 `service` 层，
> 而组件只是把业务中的数据展示出来，或者调用下业务的方法，像 `UI层` 一样。

这样带来的好处显而易见，

1. 直接在 `service` 中就可以完成所有的业务逻辑，无需等待 ui 稿完成。甚至业务跟 ui 可以交给 2 个人去并行开发，提高生产力。
2. 集中式的数据、业务管理，可以最直观的快速了解当前所有功能，把控业务流程。
3. 不需要 `props`、`emit`、`event`，所有数据都在 service 层，也就不存在（多层级、未知层级的）组件间传值、调用的 case 了。
4. 不需要复杂的概念，也不要复杂的使用方式。状态管理本身就不需要那么复杂。

举个例子：

```html
<!-- vue 为例子，某个搜索的业务 -->
<input v-model="service.state.searchModel" @mousedown.enter="service.search()" />
```

> 没错，业务应该由【数据】和【行为】组成，这部分没必要放进组件（vue/react/ng）中。
> 如果你觉得这个想法没问题，那么往下看咱们聊聊实现方式。

## hook-service

`hook` 被很多人认为是复用逻辑的最佳方式，觉得 `不用 class 可以避免 this 问题` （不太理解，一直不觉得这是个问题。框架用多了不会写 js 了吗）。

我有另一种观念，`hook` 应该是复用逻辑的 `入口`，业务逻辑跟任何框架都没关系！
不应该在 hook 里写业务，而是应该在里面调用业务。

发完牢骚，来看 vue 跟 react 要怎么实现这种方式。

## vue

我想这么用：

```ts
export class SomeService {
    state = {
        show: true
    };

    toggle() {
        this.state.show = !this.state.show;
    }
}
```

一块业务应该维护在一起，

### 数据劫持

在 vue 中，数据只要被 `reactive` 过，那么在 `render`/`watch`/`computed` watcher 中都可以监听到其改变。
直白点，只要将一份数据进行 `数据劫持`，那么组件中应用到该数据的地方，都会随着数据改动而重新执行（也有些会延迟或干脆不执行，比如一些 watcher 会先标记下 dirty）。

这种 `数据劫持` 行为可以显示调用，比如通过 vue2 的 `Vue.observable`，vue3 的 `reactive`，
或者一种隐式的方式，把数据放到某个组件的 data 中（vuex 的实现方式）。

该行为如果发生在组件的 setup tick 中，即视为该组件的 data，
如果发生在其它地方，可认为是全局的 data，不会随着组件销毁。实际上组件的 data 如果一直被引用也可以长期保留，只是不建议这么用。

### context 传递

从 vue2 开始就提供了 `provide`、`inject` 方法，来实现可跨深层级的依赖注入的能力。

那么结合上述例子，传递的方式就可以这样：

```ts
const key = Symbol();

function useSomeService<T>() {
    let instance = inject<InstanceType<T>>(key, null as any);
    if (!instance) {
        instance = new SomeService();
        reactive(instance.state);
        provide(key, instance);
    }
    return instance;
}
```

只用在业务的 root 组件中调用该函数，即可把业务传递给所有的组件。

> 同样的，建议把 service 分为 `全局`/`业务级`
> 全局的即单例，常驻内存。比如用户登录信息等。
> 业务级的跟随组件生命周期，可以随着 `业务组件` 一起被销毁，比如说某个业务页面。

### 在 template 中使用

```html
<!-- use in template -->
<template>
    <div>
        <button @click="() => svc.toggle()">update</button>
        <span v-if="svc.state.show">...</span>
    </div>
</template>
```

### vue-hook-svc

更易用、完善的封装可以访问：[vue-hook-svc](https://github.com/shalldie/hook-service/tree/master/packages/vue-hook-svc)

## react

我想这么用：

```ts
export class SomeService {
    state = {
        show: true
    };

    toggle() {
        this.setState({
            show: !this.state.show
        });
    }
}
```

### 数据监听

与 vue 不同，react 无法监听到数据的改变，调用 `setState` 可以主动触发 render 执行。

利用这一特性，需要做两件事情，可以完成在 service 中修改数据来影响 react 组件：

1. 把 service 的 state 替换为 useState 的 state
2. 把 service 的 setState 替换为 useState 的 setState

那么在 service 中对于数据的变更，就会影响到与其相关的 `react 组件`。

### context 传递

react 同样有 `provide/inject`，这个不谈了。

### 在 FC 中使用

```tsx
function AppBase() {
    // 在包一层之后，当前及其子组件，都可以使用 `userService` 获取相同的实例
    const svc = useService();

    const show = useMemo(() => svc.state.show, [svc]);

    return (
        <>
            <button onClick={() => svc.toggle()}></button>
            {show && <span>...</span>}
        </>
    );
}
```

### react-hook-svc

更易用、完善的封装可以访问：[react-hook-svc](https://github.com/shalldie/hook-service/tree/master/packages/react-hook-svc)

## 我所期望的状态管理

1. 可以区分 全局/业务级
    - 全局是单例
    - 业务级有生命周期
2. 有一个 reactive 的 state ，随便你在哪里用
3. 有对应的业务方法，供对应业务组件使用
    - 大部分业务应该放在 service 里面声明。 `service.method()`
    - 不需要 props, emit, dispatch。 组件间传值可以是多余的。
4. 使用简单，不要有太多概念，可以用常规优化方式
    - 我不想知道 `mutations`, `actions`, `dispatch`, `reducer`, `combineXXX`...
    - `时间旅行` 等概念很强大，但是 `99%` 的情况用不上，不需要。

## 不仅仅是 store，更是 service

一个系统，亦或一块业务、一个组件，应该分为 `数据`、`业务`、`UI` 3 部分。

常见的 store 往往只是数据层，我希望 `状态管理`（service） 可以作为 `数据+业务`，组件（UI）只需要展示 service 的数据，调用 service 的方法。

## 相关链接

[https://github.com/shalldie/hook-service](https://github.com/shalldie/hook-service)
