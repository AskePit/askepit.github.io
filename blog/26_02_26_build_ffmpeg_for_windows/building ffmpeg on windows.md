---
tags:
  - article
  - ffmpeg
title: Build ffmpeg for Windows
url-title: build_ffmpeg_for_windows
description: Recently I had to build ffmpeg on Windows using the MSVC compiler. And let me tell you — I nearly died. The official documentation for building the project on Windows is hopelessly outdated
keywords:
  - c++
  - c
  - ffmpeg
  - windows
image: https://habrastorage.org/r/w780/getpro/habr/upload_files/5fd/2ab/95a/5fd2ab95abf261ce8c04e7abb07f7c06.jpg
date: 26.02.2026
---

Recently I had to build [ffmpeg](https://ffmpeg.org/) on Windows using the MSVC compiler. And let me tell you — I nearly died. The official documentation for building the project on Windows is hopelessly outdated. There are even articles on the internet that open with: "The official documentation for building ffmpeg on Windows is hopelessly outdated — here's how to do it now." The funny part is that those articles are outdated too, and don't provide a working "press X to compile" solution anymore.

So I'll just leave here an instruction that works as of February 2026. It will probably become outdated like all the ones before it. But when it does, just let me know and I'll try to keep it current.

# Installing MSYS2

First things first, we'll install MSYS2, which gives us a Unix-like environment on Windows — specifically the ability to run `configure` and `make`.

- Download and run [MSYS2](https://www.msys2.org/)
- Open the file `c:/msys64/msys2_shell.cmd` and remove `rem` from the line `rem set MSYS2_PATH_TYPE=inherit`
- Launch `x64 Native Tools Command Prompt for VS 2022` (or whatever version of VS you have)
- From within that terminal, launch `c:/msys64/msys2_shell.cmd` — *another* terminal will open, and you'll run the remaining commands inside it
- `pacman -Syu`
- `pacman -S make`
- `pacman -S nasm`
- Run `mv /usr/bin/link.exe /usr/bin/link.exe.bak`. Yes, yes — we're effectively removing the local `link.exe`, because it will conflict with the MSVC toolchain's `link.exe`

Congratulations, you've configured MSYS2 to build ffmpeg with the MSVC toolchain in a Unix-like environment.

# Downloading ffmpeg

Clone the [ffmpeg repository](https://git.ffmpeg.org/ffmpeg.git) with:

```bash
git clone https://git.ffmpeg.org/ffmpeg.git <ffmpeg-folder>
```

# Building ffmpeg

First, launch the "terminal through a terminal" again:

- Launch `x64 Native Tools Command Prompt for VS 2022`
- From within that terminal, launch `c:/msys64/msys2_shell.cmd`
- In that terminal, navigate to the ffmpeg repository folder
- To verify everything is going according to plan, run `cl`. You should see something like:

```
Microsoft (R) C/C++ Optimizing Compiler Version 19.43.34809 for x64
Copyright (C) Microsoft Corporation.  All rights reserved.

usage: cl [ option... ] filename... [ /link linkoption... ]
```

If the terminal says it has no idea what `cl.exe` is, **something went wrong**. Re-read the instructions, reinstall everything, pray.

All further work happens in this second MSYS2 terminal.

## Default Build

The most minimal ffmpeg build:

```bash
./configure --target-os=win64 --arch=x86_64 --toolchain=msvc
make -j16
```

## Custom Build

You can add various configuration flags to `configure`, which you can discover via `./configure --help`. Ffmpeg has extremely extensive customization options.

Example:

```bash
./configure \
  --target-os=win64 \
  --arch=x86_64 \
  --toolchain=msvc \
  --disable-programs \
  --disable-doc \
  --disable-encoders \
  --disable-muxers \
  --disable-filters \
  --disable-devices \
  --disable-network \
  --disable-avfilter \
  --disable-avdevice \
  --disable-mediafoundation \
  --enable-decoder=aac,ac3,adpcm_ima_wav,adpcm_ms,alac,av1,bmp,eac3,dnxhd,ffv1,ffvhuff,flac,flc,flic,flv1,gif,h263,h263p,h264,hevc,indeo3,indeo4,indeo5,mjpeg,mp3,mpeg1video,mpeg2video,mpeg4,msmpeg4v2,msmpeg4v3,opus,pal8,paletteuse,pcm_s16le,pcm_s24le,prores,png,rawvideo,rv10,rv20,svq1,svq3,theora,tiff,vc1,vorbis,vp8,vp9,webp,wmv1,wmv2,wmv3 \
  --enable-demuxer=asf,avi,flc,flic,flv,gif,image2,image2pipe,matroska,mjpeg,mov,mp3,mp4,mpegps,mpegts,ogg,png,wav,webm,webp \
  --enable-parser=aac,ac3,flac,h263,h264,hevc,mpeg4video,mpegvideo,rawvideo,vorbis,vp8,vp9 \
  --enable-protocol=file \
  --enable-swscale \
  --enable-swresample \
  --enable-avformat \
  --enable-avcodec \
  --enable-avutil \
  --enable-zlib \
  --extra-cflags="-I../thirdparty/zlib" \
  --extra-ldflags="-LIBPATH:../bin/obj/thirdparty/zlib"

make -j16
```

## Building a Dynamic Library

By default `make` builds static libraries. If you need DLLs, add the following flags to `configure`:

```bash
./configure \
  ...
  --enable-shared \
  --disable-static

make -j16
```

# Where Everything Gets Built

Finding the built libraries and header files so you can actually use them in your project is its own little adventure.

The `*.lib` files are scattered across the following folders:

```
ffmpeg/libavcodec/avcodec.lib
ffmpeg/libavdevice/avdevice.lib
ffmpeg/libavfilter/avfilter.lib
ffmpeg/libavformat/avformat.lib
ffmpeg/libavutil/avutil.lib
ffmpeg/libswresample/swresample.lib
ffmpeg/libswscale/swscale.lib
```

If you feel like it, you can write a script that simply searches the entire repository for all `*.lib`, `*.dll`, `*.pdb` files and drops them into your project.

For headers it's a bit more involved. You need to, drumroll please... copy all `*.h` and `*.hpp` files from the repository into your project **preserving the folder structure**. You can also write a script to do this for you. The bonus challenge ~~for hardcore nerds~~ — write a script that analyzes each header file, builds a dependency tree of all headers, and deletes any headers that nobody references %).

---

Since I'm so casually throwing around the idea of writing scripts for all this, it would be strange not to show how I actually handle it. I use Python:

```python
def make_dir(path):
    os.makedirs(path, exist_ok=True)

def remove_dir(path):
    shutil.rmtree(path, ignore_errors=True)

def copy_files(src, dst, extensisons: list[str], preserve_structure: bool = True):
    make_dir(dst)
    for root, dirs, files in os.walk(src):
        for file in files:
            if any(file.endswith(ext) for ext in extensisons):
                src_file = os.path.join(root, file)
                if preserve_structure:
                    rel_path = os.path.relpath(root, src)
                    dst_dir = os.path.join(dst, rel_path)
                    make_dir(dst_dir)
                    dst_file = os.path.join(dst_dir, file)
                else:
                    dst_file = os.path.join(dst, file)
                shutil.copy2(src_file, dst_file)

def copy_ffmpeg():
    remove_dir('app/ffmpeg_lib')
    remove_dir('app/ffmpeg_include')

    copy_files('ffmpeg', 'app/ffmpeg_lib', ['.lib', '.dll', '.pdb'], preserve_structure=False)
    copy_files('ffmpeg', 'app/ffmpeg_include', ['.h', '.hpp'], preserve_structure=True)
```

# Conclusion

Building ffmpeg on Windows is not exactly a pleasant experience. I hope this guide makes your life with ffmpeg just a tiny bit more enjoyable.

Any corrections or alternative simpler ways to build ffmpeg on Windows are welcome in the comments. If you just want to complain about ffmpeg — also feel free. If you want to tell me what a noob I am and that it's actually super simple — I'll read that too with pleasure.
