# 使用 docker 遇到的一些坑

## 启动服务系统卡死

在某次 `systemctl start docker` 的时候，系统直接卡住了，ssh 自动断开，再也连不上，只能重启。

重装了 docker 也无法解决问题，尝试了 n 多方法，就差升级系统内核了，，，这种情况连日志也没有。

后来删除了 `/var/lib/docker` 目录搞定，可能是 dockerd 在启动的时候会对这个目录做一些操作，但是为啥系统会卡住，，，
