# 在 1 核 1G 上使用 k3s

工作要用到所以想学习下 k8s 相关知识，之前只是会用些常规命令，并没有系统学习过。
，，，还特地买了本书，结果发现自己服务器只有 1 核 1G ，抠抠索索的我自然不愿意花钱升配置，后来发现了 k3s 这个替代品，反正 api 都一样，于是产生了把博客服务迁移到 k3s 的想法。

## 检查配置

要求内存 512M，看了下我还有 523M，似乎够用，撸起袖子干 😂😂

```bash
[root@xielaobandeos ~]# free -h
              total        used        free      shared  buff/cache   available
Mem:          981Mi       343Mi       252Mi       2.0Mi       385Mi       523Mi
Swap:            0B          0B          0B
```

## 安装 k3s

可以使用在线脚本快速安装，在我踩过不少坑后，总结了一些安装调整参数如下：

1.  使用国内源，会更快
2.  使用 docker 作为容器引擎（需要预装 docker）
3.  给 kubectl 及其相关配置添加权限，使其它用户也可以访问
4.  nodePort 默认范围是 30000-32768，这里调整一下
5.  禁止部署、开启 traefik，稍后自己来部署

```bash
curl -sfL http://rancher-mirror.cnrancher.com/k3s/k3s-install.sh | INSTALL_K3S_MIRROR=cn sh -s - \
--docker \
--write-kubeconfig-mode 666 \
--kube-apiserver-arg service-node-port-range=1-65535 \
--disable traefik
```

整个安装过程还是挺快的，之后可以使用下面的命令，来查看所有组件，是否都成功安装。

    因为安装时禁用了自带的 traefik，所以会少一些服务。

```bash
[root@xielaobandeos ~]# kubectl get all -n kube-system

NAME                                          READY   STATUS    RESTARTS   AGE
pod/coredns-854c77959c-l5pnm                  1/1     Running   0          2d23h
pod/metrics-server-86cbb8457f-hzdjh           1/1     Running   0          2d23h
pod/local-path-provisioner-5ff76fc89d-69mcp   1/1     Running   0          2d23h

NAME                     TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                  AGE
service/kube-dns         ClusterIP   10.43.0.10     <none>        53/UDP,53/TCP,9153/TCP   2d23h
service/metrics-server   ClusterIP   10.43.161.96   <none>        443/TCP                  2d23h

NAME                                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/coredns                  1/1     1            1           2d23h
deployment.apps/metrics-server           1/1     1            1           2d23h
deployment.apps/local-path-provisioner   1/1     1            1           2d23h

NAME                                                DESIRED   CURRENT   READY   AGE
replicaset.apps/coredns-854c77959c                  1         1         1       2d23h
replicaset.apps/metrics-server-86cbb8457f           1         1         1       2d23h
replicaset.apps/local-path-provisioner-5ff76fc89d   1         1         1       2d23h
```

## 如何卸载 k3s

输入 `k3s` 按下 `tab` 可以看到提供了以下环境变量，`k3s-killall.sh` 是停止所有 k3s 服务，`k3s-uninstall.sh` 是把所有 k3s 组件卸载。

实测 `k3s-uninstall.sh` 执行后一些 docker 的镜像、容器还是需要自己手动删除，可能跟所选的容器运行时有关吧。

```bash
[root@xielaobandeos blog-docker]# k3s
k3s               k3s-killall.sh    k3s-uninstall.sh
```

## 对 cpu 和内存的影响

安装完会明显感到机器越来越卡，输入个指令要等好久才会响应。这是正在拉取相关镜像，部署容器。在等一段时间后即恢复。

结合 `top` 和 `free -h` 可以看到 cpu、内存 都快打满，，，（ps：果然在 1c1g 上太勉强）。 使用 `k3s-killall.sh` 后可以看到如下曲线：

<img class="preview" src="./assets/cpu_memo.png">

## helm

helm 帮助管理 Kubernetes 应用程序，Helm Charts 帮助定义、安装和升级最复杂的 Kubernetes 应用程序。

说实话刚学习 k8s 的时候感觉真 tmd 复杂，那么多配置文件如果都要自己一个个 `apply` 的话难免有遗漏，辛苦另说。
但是 helm 让我看到了另一种部署形态，它就像 `npm`，`yum`，`apt` 一样，可以把整个应用、服务打包成一个 chart，一键部署，一键升级。

### 安装 helm

1. 可以在 [https://github.com/helm/helm/releases](https://github.com/helm/helm/releases) 下载合适版本的二进制文件
2. `tar -zxvf helm.xxx.tar.gz` 解压
3. `mv linux-amd64/helm /usr/local/bin/helm` 放到 bin 下

### 调整配置

使用 `helm ls` 的时候，会有以下错误提示：

    Error: Kubernetes cluster unreachable: Get "http://localhost:8080/version?timeout=32s": dial tcp [::1]:8080: connect: connection refused

这个是因为 helm 默认会去寻找 k8s 的配置，我们需要把 k3s 的配置文件添加到环境变量让 helm 识别出来：

```bash
$ vim ~/.bashrc
$ # 把这句添加进去
$ export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

### 使用 helm 安装 traefik

使用 k3s 自带的 traefik，默认的配置文件在 `/var/lib/rancher/k3s/server/manifests/traefik.yaml` 中，对该文件的任何修改都会以类似 kubectl apply 的方式自动部署到 Kubernetes 中。

我在安装 k3s 的时候去掉了自带的 traefik，原因是因为配置不好管理，整个服务也不好控制。
选择了使用 helm 安装的方式，只需要 `helm repo add traefik https://helm.traefik.io/traefik`，即可把 traefik chart 添加到本地 helm 仓库中。

具体使用和配置可以参考： [https://github.com/traefik/traefik-helm-chart](https://github.com/traefik/traefik-helm-chart)

## 部署 Ingress

### 启动 traefik

在上面安装完 traefik 之后，可以使用 `helm install traefik traefik/traefik` 来启动，这里建议去看看默认的 `values.yaml`，适当调整下。

### 给服务添加 Ingress

traefik 会监控整个 k3s 集群中的 Ingress，并为这些 Ingress 创建对应的路由，我们如果有一个服务想接入，可以在服务所在的命名空间中添加个 Ingress 即可。

<!-- prettier-ignore -->
```yaml
# ingress.yaml
kind: Ingress
apiVersion: extensions/v1beta1
metadata:
  name: ingress-traefik
  namespace: xxx
spec:
  rules:
    - http:
        paths:
          - path: /
            backend:
              serviceName: some-name
              servicePort: some-port
```

## 私有镜像仓库

如果镜像位于私人仓库中，需要登录的话，可以使用 secret。

<!-- prettier-ignore -->
```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  namespace: {{ .Values.namespace }}
  name: {{ .Values.secret.name }}
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "https://index.docker.io/v1/": {
          "username": "{{ .Values.secret.username }}",
          "password": "{{ .Values.secret.password }}"
        }
      }
    }
```

<!-- prettier-ignore -->
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: {{ .Values.namespace }}
  name: {{ .Values.blog.name }}
spec:
  replicas: {{ .Values.blog.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Values.blog.name }}
  template:
    metadata:
      labels:
        app: {{ .Values.blog.name }}
    spec:
      imagePullSecrets:
        - name: {{ .Values.secret.name }} # 用在这里
      containers:
        - name: {{ .Values.blog.name }}
          image: {{ .Values.blog.image }}
          imagePullPolicy: {{ .Values.blog.imagePullPolicy }}
          ports:
            - containerPort: {{ .Values.blog.targetPort }}
```

## 最后

这次尝试蛮辛苦，后来多次反思为什么要这么折腾自己？ “`因为 k3s 就在那里`”。

> 后来因为[阿里云]升级比重买贵，换了[腾讯云]的 `2c4g`
> 在 `1 核 1G` 上可以用来学习 kubenetes ，实际应用还是需要配置更高的机器。

## 参考

[k3s 安装选项介绍](https://docs.rancher.cn/docs/k3s/installation/install-options/_index)
[如何在一台 1 核 1G 的服务器上部署 Kubernetes](https://gianthard.rocks/a/74)
[一文搞懂 Traefik2.1 的使用](https://zhuanlan.zhihu.com/p/111267604)
[traefik-helm-chart](https://github.com/traefik/traefik-helm-chart)
