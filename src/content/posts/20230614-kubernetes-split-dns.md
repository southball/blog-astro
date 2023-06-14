---
title: "Delegating a Certain Domain to Another DNS in Kubernetes"
published: 2023-06-14
category: infra
tags: [coredns, kubernetes]
icon: "eos-icons:dns"
---

Assume the DNS server is at `192.168.1.1` and the domain to forward is `internal.yuru.site`. Execute

```sh
kubectl edit configmap coredns -n kube-system
```

Insert the following line before `forward . /etc/resolv.conf`:

```
forward internal.yuru.site 192.168.1.1
```