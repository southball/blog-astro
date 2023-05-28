---
title: "Playing with Kubernetes (1)"
published: 2023-05-05
category: infra
tags: [kubernetes]
icon: "mdi:kubernetes"
---

# Creating Kubernetes Cluster

First, a Kubernetes cluster with 2 nodes is created using `k3s`. Each node is given 4 CPU cores (with 1 CPU limit) and 8 GB of memory.

```sh
# On the first machine (IP 10.10.10.101)
curl https://get.k3s.io | sh -
sudo cat /var/lib/rancher/k3s/server/node-token
# On the second machine (IP 10.10.10.102)
curl https://get.k3s.io | K3S_TOKEN=<...> K3S_URL=http://10.10.10.101:6443 sh -
```

Disable `traefik` as it is not needed, following the instructions at <https://github.com/k3s-io/k3s/issues/1160#issuecomment-561572618>.

Follow <https://docs.k3s.io/cluster-access> to setup local access to the created Kubernetes cluster.

# Installing Istio

Install [Istio](https://istio.io/) with [Helm](https://helm.sh/), using default settings[^istio-install].

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
kubectl create namespace istio-system
helm install istio-base istio/base -n istio-system
helm install istiod istio/istiod -n istio-system --wait
kubectl create namespace istio-ingress
helm install istio-ingress istio/gateway -n istio-ingress --wait
kubectl label namespace default istio-injection=enabled --overwrite
```

# Creating the default Istio gateway

Create a default wildcard gateway so services exposed with the given gateway can be accessed from outside the cluster.

```bash
kubectl apply -f gateway.yml
```

<details><summary><code>gateway.yml</code></summary>

```yml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: istio-gateway
spec:
  selector:
    istio: ingress
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*"
```

</details>

# Installing httpbin and Creating Virtual Service

As the first service in the cluster, install [httpbin](https://httpbin.org) and create the corresponding virtual service so it can be accessed from outside the cluster.

```bash
kubectl apply -f httpbin/deployment.yml
kubectl apply -f httpbin/service.yml
kubectl apply -f httpbin/virtual-service.yml
```

<details><summary><code>httpbin/deployment.yml</code></summary>

```yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  replicas: 3
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
        - name: httpbin
          image: kennethreitz/httpbin
          ports:
            - containerPort: 80
```

</details>

<details><summary><code>httpbin/service.yml</code></summary>

```yml
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  selector:
    app: httpbin
  ports:
    - name: web
      protocol: TCP
      port: 80
      targetPort: 80
```

</details>

<details><summary><code>httpbin/virtual-service.yml</code></summary>

```yml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: httpbin
spec:
  hosts:
    - httpbin.in.yuru.site
  gateways:
    - istio-gateway
  http:
    - name: httpbin
      route:
        - destination:
            host: httpbin.default.svc.cluster.local
```

</details>

# Installing Longhorn

Install [Longhorn](https://longhorn.io/docs/1.4.1/deploy/install/install-with-helm/) with Helm[^longhorn-helm]. Since there are only 2 nodes, set the default replica count to 2 in `values.yml`.

```bash
helm repo add longhorn https://charts.longhorn.io
helm repo update
helm install longhorn longhorn/longhorn --namespace longhorn-system --create-namespace --values longtail/values.yml --version 1.4.1
```

<details><summary><code>longtail/values.yml</code></summary>

```yml
global:
  persistence:
    defaultClassReplicaCount: 2
```

</details>

# Setting up Promtail to Export All Logs

Since there is a [Loki](https://grafana.com/oss/loki/) instance setup on another server, it would be easier to pipe all logs from Kubernetes to the Loki server.

To do so, install [Promtail](https://grafana.com/docs/loki/latest/clients/promtail/) using the [helm chart](https://github.com/grafana/helm-charts/tree/main/charts/promtail).

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install --namespace monitoring --values promtail/values.yml promtail grafana/promtail
```

<details><summary><code>promtail/values.yml</code></summary>

```yml
config:
  clients:
    - url: http://<Loki address>/loki/api/v1/push
```

</details>

# Deploying HashiCorp Vault on Another Machine

On another server, install [HashiCorp Vault](https://www.vaultproject.io/)[^vault-install]

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install vault
```

Then edit `/etc/vault.d/vault.hcl`, and restart with `sudo systemctl restart vault`. Note that TLS is disabled here.

<details><summary><code>vault.hcl</code></summary>

```hcl
ui = true

storage "file" {
  path = "/opt/vault/data"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 1
}
```

</details>

Finally, access the UI at `http://<Vault address>:8200/ui`, setup the Vault and create a KV Secret Engine at `kv`[^kv-secret-engine].

# Setting up External Secrets with HashiCorp Vault

Using [External Secrets Operator](https://external-secrets.io/), it is possible to create secrets from [the KV Secrets Engine](https://developer.hashicorp.com/vault/docs/secrets/kv) in Vault. Install External Secrets Operator with Helm[^external-secrets-operator-helm], then create a SecretStore following the [example](https://external-secrets.io/v0.8.1/provider/hashicorp-vault/#example)[^external-secrets-operator-example].

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets --create-namespace

kubectl apply -f external-secrets/token.yml
kubectl apply -f external-secrets/secret-store.yml
```

<details><summary><code>external-secrets/token.yml</code></summary>

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: vault-token
data:
  token: "<token in base64 here>"
```

</details>

<details><summary><code>external-secrets/secret-store.yml</code></summary>

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault
spec:
  provider:
    vault:
      server: http://<Vault address>:8200
      path: kv
      version: v2
      auth:
        tokenSecretRef:
          name: vault-token
          key: token
```

</details>

# Deploying single-pod Minio Server

In order to create a Minio server with non-default credentials, we need to provide the environment variables `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`.
With external secrets set up, we can create an `ExternalSecret` that maps to a normal Kubernetes `Secret`, and use the `Secret` to populate the environment variables.

```bash
vault kv put kv/minio-root-credentials username=<...> password=<...>
kubectl apply -f minio/external-secret.yml
kubectl apply -f minio/stateful-set.yml
kubectl apply -f minio/service.yml
kubectl apply -f minio/virtual-service.yml
```

<details><summary><code>minio/external-secret.yml</code></summary>

```yml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: minio-root-credentials
spec:
  refreshInterval: "15s"
  secretStoreRef:
    name: vault
    kind: SecretStore
  target:
    name: minio-root-credentials
  data:
    - secretKey: MINIO_ROOT_USER
      remoteRef:
        key: minio-root-credentials
        property: username
    - secretKey: MINIO_ROOT_PASSWORD
      remoteRef:
        key: minio-root-credentials
        property: password
```

</details>

<details><summary><code>minio/stateful-set.yml</code></summary>

```yml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: minio
spec:
  selector:
    matchLabels:
      app: minio
  serviceName: minio
  replicas: 1
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
        - name: minio
          image: quay.io/minio/minio
          args: ["server", "--console-address", ":9001", "/data"]
          ports:
            - containerPort: 9000
            - containerPort: 9001
          volumeMounts:
            - name: data
              mountPath: /data
          envFrom:
            - secretRef:
                name: minio-root-credentials
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        storageClassName: longhorn
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 20Gi
```

</details>

<details><summary><code>minio/service.yml</code></summary>

```yml
apiVersion: v1
kind: Service
metadata:
  name: minio
spec:
  selector:
    app: minio
  ports:
    - name: api
      port: 9000
      targetPort: 9000
    - name: console
      port: 9001
      targetPort: 9001
```

</details>

<details><summary><code>minio/virtual-service.yml</code></summary>

```yml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: minio-console
spec:
  hosts:
    - minio-console.in.yuru.site
  gateways:
    - istio-gateway
  http:
    - name: minio-console
      route:
        - destination:
            host: minio.default.svc.cluster.local
            port:
              number: 9001
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: minio
spec:
  hosts:
    - minio.default.svc.cluster.local
  http:
    - name: minio
      match:
        - port: 9000
      route:
        - destination:
            host: minio.default.svc.cluster.local
            port:
              number: 9000
```

</details>

# Todos

- Enable TLS for Vault and ensure Kubernetes can connect to Vault
- Installing in-cluster Prometheus and [Kiali](https://kiali.io/) for visualization of Istio

[^external-secrets-operator-example]: https://external-secrets.io/v0.8.1/provider/hashicorp-vault/#example
[^external-secrets-operator-helm]: https://external-secrets.io/v0.8.1/introduction/getting-started/
[^istio-install]: https://istio.io/latest/docs/setup/install/helm/
[^kv-secret-engine]: https://developer.hashicorp.com/vault/docs/secrets/kv
[^longhorn-helm]: https://longhorn.io/docs/1.4.1/deploy/install/install-with-helm/
[^vault-install]: https://developer.hashicorp.com/vault/downloads
