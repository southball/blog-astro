---
title: "Using Claude Code a Little Bit More Securely"
published: 2025-07-30
category: security
tags:
- llm
- claude-code
- dev container
- security
icon: "material-symbols:security"
---

It is tempting to use Claude Code with `--dangerously-skip-permissions`, but doing it on a PC can lead to some [interesting accidents](https://x.com/johnlindquist/status/1926302544038338674). Trying to prevent AI from doing anything dangerous while making sure that it can autonomously complete tasks takes time (who has time anyway), so another solution is to put the coding agent in an environment where it can mess up and we can start again.

One solution here is to use a Docker container. [Dev containers](https://containers.dev/) are a good solution. To set up a project for dev container, Claude Code conveniently provides [a guide for setting up dev container](https://docs.anthropic.com/en/docs/claude-code/devcontainer#configuration-breakdown). 

However, most of the time projects already have dev containers set up and it is more convenient to modify the existing dev container. Dev containers conveniently provide a feature called [dev container features](https://containers.dev/features) (pun intended). Anthropic also provides Claude Code as a dev container feature at [`anthropics/devcontainer-features`](https://github.com/anthropics/devcontainer-features).

```json
{
    // ...
    "features": {
        "ghcr.io/anthropics/devcontainer-features/claude-code:1.0": {}
    },
    // To share Claude Code settings across devcontainers
    "mounts": [
        {
            "source": "${localEnv:HOME}/.claude.json",
            "target": "/home/vscode/.claude.json",
            "type": "bind"
        },
        {
            "source": "${localEnv:HOME}/.claude",
            "target": "/home/vscode/.claude",
            "type": "bind"
        }
    ],
    // ...
}
```

and voila! You can now use Claude Code without worrying that your home directory will be gone when you're back.
