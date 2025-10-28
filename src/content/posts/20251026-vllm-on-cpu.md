---
title: "How to run vLLM (for embedding) in Docker on CPU"
published: 2025-10-26
category: programming
tags:
- llm
icon: "material-symbols:smart-toy"
---

While trying to build a RAG pipeline for some documents, I had to solve the problem of running vLLM on the CPU.

# The journey to getting vLLM working on my CPU

By default, vLLM assumes that you run with a GPU, and there are prebuilt images ([docs](https://docs.vllm.ai/en/stable/deployment/docker.html)) at <https://hub.docker.com/r/vllm/vllm-openai> making testing and deployment easy.

In the case of running it on CPU, there are also prebuilt images ([docs](https://docs.vllm.ai/en/latest/getting_started/installation/cpu.html#pre-built-images)) at <https://gallery.ecr.aws/q9t5s3a7/vllm-cpu-release-repo>. However, the default setting assumes that `avx512f` is available.

Since my compute server runs on i9-14900k which has no support for AVX-512 instructions, the only solution here is to build an image that does NOT assume AVX-512 support following the instructions to [build image from source](https://docs.vllm.ai/en/latest/getting_started/installation/cpu.html#build-image-from-source).

Here, the Dockerfile is a little bit finicky; for example, building from a Git submodule doesn't work [^build-from-git-submodule], and the image must be built in a clone of the repository.

To prevent having to build the image every time, I have automated the building of the image in [southball/vllm-avx2-docker](https://github.com/southball/vllm-avx2-docker) so the CPU-only, no-AVX-512-assumed image can be used by pulling `ghcr.io/southball/vllm-avx2-docker` (if you trust it).

# Performance

vLLM with AVX2 only performs reasonably well: a quick benchmark with

```sh
oha -z 10s 'http://localhost:8000/v1/embeddings' -d '{"model":"Qwen/Qwen3-Embedding-0.6B","input":"Test?"}' -H 'Content-Type: application/json' -m POST -c 32
```

reported about 80 requests/second [^cpu] handled, while performing the same test with Ollama on RTX 3060 yielded about 120 requests/second.

vLLM powered by OpenVINO ([vllm-project/vllm-openvino](https://github.com/vllm-project/vllm-openvino)) might perform better; however, it seems to not support running embedding models - when tested, the same error as in [vllm-project/vllm#13287](https://github.com/vllm-project/vllm/issues/13287) is produced.

# Conclusion

Although it's a bit hard to get working, vLLM runs perfectly fun on the CPU, so if you have to do so hopefully this is a useful reference for you.

[^build-from-git-submodule]: https://github.com/vllm-project/vllm/issues/9182
[^cpu]: The i9-14900k in the server is throttled to 65W, so the performance should be lower than a normal i9-14900k.
