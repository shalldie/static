# 使用 Traefik 边缘路由器

![Traefik](./assets/traefik-cover.png)

## 简介

`Traefik` 是一个现代化的反向代理、负载均衡工具，使得微服务的部署更加容易。

Traefik 兼容所有主流的集群技术，比如 `Docker`, `Swarm mode`, `Kubernetes`, `Marathon`, `Consul`, `Etcd`, `Rancher`, `Amazon ECS`, `...`

最吸引我的是，它的配置是 `自动` 且 `动态` 的，用人话说就是：

    会自动监听配置文件改动，自动发现新服务接入，并更新自己的配置，无需人工重启。

## 与 nginx 相比

很长一段时间我都在用 `nginx` 作为流量分发的入口，`nginx` 配置简单，快速，功能强大，成熟稳定，balabala...

如今我把应用入口换成了 `Traefik`，并不是说 `nginx` 比之差一些，而是 `Traefik` 有一些很强大的功能，作为 `边缘路由器` 更合适、更 cool，`nginx` 在其它场景下依然使用很广泛，这里列一些 `Traefik` 的优势：

1. 自带一个 dashboard 界面，可视化更直观。
2. 自带 `服务发现` 能力，可自动监听配置改动、发现新服务，并自动更新无需人工重启。（像不像 Ingress？）
3. 更现代，因为比较新，所以考虑了很多容器技术、编排工具，可以支持 `本地配置`、`Docker`、`Kubernetes` 等。
4. 提供了 `Let's Encrypt` 证书工具，我用它替换掉了 `acme.sh`，毕竟原生支持更方便，作为 `边缘路由器` 的角色也很合理。
5. 折腾一下 ...

## 安装

