---
title: "Securing Mobile Access to Homelab Services with mTLS"
published: 2024-06-11
category: infra
tags:
- step-ca
- homelab
icon: "mdi:encryption"
---

I have servers (mainly mini PCs) at home, running some services. To access these servers everywhere, I usually use [Tailscale](https://tailscale.com/) to do so. However, on my phone, it is a bit annoying to do so, and it drains battery fast sometimes. Therefore, I have explored using mutual TLS (mTLS) to secure the access to these services.

An introduction to mTLS can be found [here](https://tetrate.io/learn/what-is-mtls/).

# What I did

Since I already have a self-hosted Certificate Authority using [step-ca](https://smallstep.com/docs/step-ca/), I was able to do most of these pretty easily.

## Starting a server with mTLS

[Caddy](https://caddyserver.com/) obtains and renews TLS certificate automatically, so we will use it as reverse proxy.

First, to see more verbose logs for debugging, we can add this block to the beginning of the Caddyfile (in my case, at `/etc/caddy/Caddyfile`).

```caddy
{
    debug
}
```

Then, we can add a block.

```caddy
https://subdomain.mydomain.com {
    root * /usr/share/caddy
    file_server
}
```

Run `systemctl restart caddy` to restart the server. If we have the DNS set to point to the server, then Caddy will automatically obtain a certificate using the Let's Encrypt CA.

## Using a custom CA

To use our own ACME server, we use the [`tls` directive](https://caddyserver.com/docs/caddyfile/directives/tls).

```caddy
https://subdomain.mydomain.com {
    tls myemail@mydomain.com {
        ca https://ca.mydomain.com/acme/directory
        ca_root /etc/caddy/root_ca.crt
    }
    root * /usr/share/caddy
    file_server
}
```

To enable mTLS, we use [`client_auth`](https://caddyserver.com/docs/caddyfile/directives/tls#client_auth) in the [`tls` directive](https://caddyserver.com/docs/caddyfile/directives/tls).

```caddy
https://subdomain.mydomain.com {
    tls myemail@mydomain.com {
        ca https://ca.mydomain.com/acme/directory
        ca_root /etc/caddy/root_ca.crt
        client_auth {
            mode require_and_verify
            trusted_ca_cert_file /etc/caddy/root_ca.crt
        }
    }
    root * /usr/share/caddy
    file_server
}
```

## Refactoring Caddyfile

Since we will be repeating the `tls` setting if we have several sites, we might as well define it as a snippet.

```caddy
(base) {
    tls myemail@mydomain.com {
        ca https://ca.mydomain.com/acme/directory
        ca_root /etc/caddy/root_ca.crt
        client_auth {
            mode require_and_verify
            trusted_ca_cert_file /etc/caddy/root_ca.crt
        }
    }
}

https://subdomain.mydomain.com {
    import base
    root * /usr/share/caddy
    file_server
}
```

## Creating a Client Certificate

We can create a client certificate using `step ca certificate`.

```sh
step ca certificate "myname" client.crt client.key --not-after=24h
# Enter the password, etc.
openssl pkcs12 -export -out client.pfx -inkey client.key -in client.crt -legacy
```

In the case of using the client certificate on a phone, it is difficult to rotate the certificate. We can issue longer-lived client certificates, but it has security implications. To do so, we need to update the provisioner settings in `ca.json`.

```js
{
    /* ... */
    "key": {/* ... */},
    "encryptedKey": "...",
    "claims": { "maxTLSCertDuration": "72h" },
}
```

Then we can run the `step ca certificate` with a longer `--not-after` period.

## Importing the Client Certificate into my phone

To import the client certificate, we need to download the certificate using Safari. Also, the root CA certificate and the intermediate CA certificate also needs to be imported.

## Accessing the Website

If we try to access the website using Google Chrome, since it cannot access the client certificate, it will fail to connect with `ERR_SSL_CLIENT_AUTH_CERT_NEEDED`.

```js
/* This is the error you will see in Caddy's debug log, if you try to access using Chrome. */
Jun 11 15:00:13 <REDACTED> caddy[21029]: {"level":"debug","ts":1718118013.648463,"logger":"http.stdlib","msg":"http: TLS handshake error from <REDACTED>:63200: tls: client didn't provide a certificate"}
```

However, if we access using Safari, we will be prompted whether to use the certificate, and can connect successfully.
