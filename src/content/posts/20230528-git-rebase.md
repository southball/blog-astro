---
title: "Introduction to interactive Git rebase"
published: 2023-05-28
category: programming
tags: [git]
icon: "mdi:git"
draft: true
---

## Why this article?

There may be many good articles about Git rebase, but I failed to find one that covers everything I want it to. Plus I need a draft for the Japanese version of this article, so here it is.

## Forenote

I am not 100% sure that all information is accurate. This article is mostly based on how I commonly use this feature of Git, and I try to ensure that the information accurate, but there are no guarantees.

## What is Git rebase?

```mermaid
gitGraph
  commit id: "0000001"
  commit id: "0000002"
  branch develop
  checkout develop
  commit id: "0000003"
  commit id: "0000004"
  commit id: "0000005"
  checkout main
  commit id: "0000006"
  commit id: "0000007"
```

when we run `git rebase main` on branch `develop`, we get

```mermaid
gitGraph
  commit id: "0000001"
  commit id: "0000002"
  checkout main
  commit id: "0000006"
  commit id: "0000007"
  branch develop
  checkout develop
  commit id: "0000003"
  commit id: "0000004"
  commit id: "0000005"
```

## What is Git interactive rebase?

When we run `git rebase -i main` instead, we get `git` like below:

```
pick 0000003 Commit message for commit 3
pick 0000004 Commit message for commit 4
pick 0000005 Commit message for commit 5
```

We can edit this file, save and quit the editor. Then the rebase will begin.

### Basic commands: continue and abort

`git rebase --continue` allows one to continue a rebase, and `git rebase --abort` allows one to abort one.

### Squash

If we edit the rebase todo to as follows,

```
pick 0000003 Commit message for commit 3
squash 0000004 Commit message for commit 4
pick 0000005 Commit message for commit 5
```

Then we will get two commits: one commit consisting of changes from `0000003` and `0000004`, and another commit consisting of changes from `0000005`. You will also be prompted to edit the commit message for the commit consisting of both changes from `0000003` and `0000004`.

```mermaid
gitGraph
  commit id: "0000001"
  commit id: "0000002"
  checkout main
  commit id: "0000006"
  commit id: "0000007"
  branch develop
  checkout develop
  commit id: "0000003+0000004"
  commit id: "0000005"
```

### Edit

If we edit the rebase todo to as follows,

```
pick 0000003 Commit message for commit 3
edit 0000004 Commit message for commit 4
pick 0000005 Commit message for commit 5
```

Then the rebase will pause after the commit `0000003` and `0000004`. The state will be as shown below (assuming that no conflicts occur during the rebase of `0000003` and `0000004`):

```mermaid
gitGraph
  commit id: "0000001"
  commit id: "0000002"
  checkout main
  commit id: "0000006"
  commit id: "0000007"
  branch develop
  checkout develop
  commit id: "0000003"
  commit id: "0000004"
```

Git commands can then be issued, including `git commit --amend` after editing some files. Run `git rebase --continue` to continue the rebase.

### Drop

If we edit the rebase todo to as follows,

```
pick 0000003 Commit message for commit 3
drop 0000004 Commit message for commit 4
pick 0000005 Commit message for commit 5
```

then when the reabse completes the history will be as follows (notice that the commit `0000004` is gone):

```mermaid
gitGraph
  commit id: "0000001"
  commit id: "0000002"
  checkout main
  commit id: "0000006"
  commit id: "0000007"
  branch develop
  checkout develop
  commit id: "0000003"
  commit id: "0000005"
```

### Rearranging commits

If we edit the rebase todo to as follows,

```
pick 0000005 Commit message for commit 5
pick 0000004 Commit message for commit 4
pick 0000003 Commit message for commit 3
```

then when the reabse completes the history will be as follows (notice the order of the commits):

```mermaid
gitGraph
  commit id: "0000001"
  commit id: "0000002"
  checkout main
  commit id: "0000006"
  commit id: "0000007"
  branch develop
  checkout develop
  commit id: "0000005"
  commit id: "0000004"
  commit id: "0000003"
```

## Common patterns

### Catching up with the main branch

`git checkout feature` followed by `git rebase main` should do most of the time.

### Catching up with the main branch (with stacked PRs)
