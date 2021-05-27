# Nginx location 匹配

Nginx 经常用，不过一直感觉配置挺玄学，，，以往都贯彻 `“能用就行”` 的原则，不求甚解。

今天把 location 部分整理下，供以后查阅。

## 位置

`location` 模块 一般位于 `http/server` 下，用于对请求的分发处理。

```Nginx
http {
    gzip on;
    # ...

    server {
        listen 80;
        # ...

        location / {
            # config
        }
    }
}
```

## 语法

```Nginx
location [=|~|~*|^~|@] /uri/ {...}
```

`location` 会尝试根据用户请求中的 URI 来匹配上面的 `/uri` 表达式，如果可以匹配，就选择 `location {}` 中的配置来处理用户请求。

1. `=` 表示 URI 作为字符串，与参数中的 uri 做完全匹配。

    - 感觉用的地方不多

2. `~` 表示区分大小写的正则匹配。

    - 可以使用 `$1` （\$ + groupIndex）来取子组

3. `~*` 表示不区分大小写的正则匹配。

    - 同上

4. `^~` 前缀匹配。目的是优先于正则表达式的匹配。

    - 这个和普通匹配规则类似，但是优先级如右：`[普通] < [正则] < [^~]`

5. `@` 仅表示用 Nginx 服务内部请求之间的重定向，不讨论了。

## URL 尾部的 /

有时候写这玩意儿经常忘记后面 `/` 的作用，然后就去查一下，过段时间又忘记了，又查...

### location 尾部的 /

1. location 尾部没有 `/` 时。
    - 以 `location /a/b` 为例。
    - 可以匹配：
        - `/a/bc`
        - `/a/b/c`
2. location 尾部有 `/` 时，表示一个目录。
    - 以 `location /a/b/` 为例。
    - 可以匹配：
        - `/a/b/`
        - `/a/b/c`
    - 不能匹配：
        - `/a/bc`

### proxy_pass 尾部的 /

严格来说并不是以 proxy_pass 后面的 url 是否添加 `/` 来判断匹配。

proxy_pass 后面的地址，`host:port` 后面如果有 `任意以/开头的字符串`，就表示有 uri，实际转发规则如下：

1. 无 uri， `[proxy_pass][location][location_postfix]`

2. 有 uri， `[proxy_pass]`<del>`[location]`</del>`[location_postfix]`

即有 uri 的 proxy_pass，会把 location 定义的地址替换掉。

example:

```Nginx
# 1. 无 uri， `[proxy_pass][location][location_postfix]`
server {
    listen 80;

    location /proxy/ {
        proxy_pass 127.0.0.1:8080;
    }
}

# url:   127.0.0.1:80/proxy/info
# proxy: 127.0.0.1:8080/proxy/info


# 2. 有 uri，`[proxy_pass][location_postfix]`，location部分被替换掉
server {
    listen 80;

    location /proxy1/ {
        proxy_pass 127.0.0.1:8080/api;
    }

    location /proxy2/ {
        proxy_pass 127.0.0.1:8080/api/;
    }
}

# url:   127.0.0.1:80/proxy1/info
# proxy: 127.0.0.1:8080/apiinfo
# 过程： 127.0.0.1:8080/api/proxy1/info，然后替换掉 /proxy1/，得到  127.0.0.1:8080/apiinfo

# url:   127.0.0.1:80/proxy2/info
# proxy: 127.0.0.1:8080/api/info
# 过程： 127.0.0.1:8080/api//proxy2/info，然后替换掉 /proxy2/，得到  127.0.0.1:8080/api/info
```

## 托管静态资源

这种对于前端来说最常见了，一般用 root|alias + try_files 的组合。

### 文件路径的定义

有 root 和 alias 两种方式，差别是 root 会保留 [location] 的匹配，而 alias 会去掉。

#### root

-   语法： root path;
-   默认： root html;
-   配置块： http、server、location、if

example:

```Nginx
location /download/ {
    root /opt/web/html/;
}

# url:  host:port/download/hello.txt
# dist: /opt/web/html/download/hello.txt

# location 所定义的 /download/ 这一层会保留下来。
```

#### alias

-   语法： alias path;
-   配置块： location

example:

```Nginx
location /download/ {
    alias /opt/web/html/;
}

# url:  host:port/download/hello.txt
# dist: /opt/web/html/hello.txt

# location 所定义的 /download/ 这一层就被干掉了。
```

### 访问首页

有时访问站点的 URI 是 /，这种情况一般返回首页。 这与上述的 root、alias 都不同。

```Nginx
location / {
    root path;
    index index.html index.php;
}

# 当访问 host:port 的时候，会依次尝试返回 index.html、index.php
```

### try_files

这是必定会用到的一个命令，用于定义资源查找规则。比如常常有这么个情景：

如果应用使用 history 路由，那么对于请求能用 url 找到就返回这个资源，否则返回 /index.html。

```Nginx
location /app {
    root /root/www/;
    try_files $uri /index.html =404;
}
```

当用户访问 `/app` 的时候，会先尝试访问 `/root/www/app` 文件，再尝试 `/root/www/app/index.html`。

注意，try_files 中的 `/index.html` 是相对于 `root` 的，而 root 不能跟 alias 一起用...

root 没有 alias 那么灵活，因此使用 try_files 就有了一些限制。暂时没有找到屏蔽 root 的方式，以后再补充吧。
