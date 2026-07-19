# ⚠️ 重要：FLASH 在 conda-forge 上沒有 linux-aarch64 (Apple Silicon) 的預編譯版本，
# 只有 linux-64 (x86_64)。在 Apple Silicon Mac 上請務必加上 --platform linux/amd64：
#   docker build --platform linux/amd64 -t <tag> .
# 否則在 [conda install flash] 這一步會出現 PackagesNotFoundInChannelsError。

ARG BUILD_PLATFORM=linux/amd64

# 使用 Ubuntu 24.04 基礎映像
FROM --platform=$BUILD_PLATFORM ubuntu:24.04

# 避免安裝時的互動提示
ENV DEBIAN_FRONTEND=noninteractive

# 安裝基本工具
RUN apt-get update && apt-get install -y \
    python3.12 \
    ncbi-blast+ \
    mafft \
    wget \
    curl \
    bzip2 \
    && rm -rf /var/lib/apt/lists/*

# 建立 python 指令連結
RUN ln -sf /usr/bin/python3.12 /usr/bin/python

# 偵測架構並下載對應的 Miniconda
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
    CONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh"; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
    CONDA_URL="https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-aarch64.sh"; \
    else \
    echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    wget $CONDA_URL -O miniconda.sh && \
    bash miniconda.sh -b -p /opt/conda && \
    rm miniconda.sh

# 添加 conda 到 PATH
ENV PATH="/opt/conda/bin:$PATH"

# 使用 conda-forge 安裝 FLASH (Fast Length Adjustment of SHort reads)
# 注意：使用 --override-channels 明確指定頻道，不要動到全域的 'defaults' 頻道設定，
# 避免在非互動的 Docker build 中卡在 Anaconda 的 Terms-of-Service 確認流程
# (repo.anaconda.com/pkgs/main, pkgs/r)
RUN conda install -y --override-channels -c bioconda -c conda-forge flash && \
    conda clean -a

# 建立工作目錄
WORKDIR /app
RUN mkdir -p /app/data /app/output

# 建立測試腳本
# 注意：歡迎訊息只在「沒有帶指令」的互動模式下才印出。
# 若有帶指令（我們的後端每次都是 `python3 <script>`），直接 exec，不印任何東西。
# 這是因為 MAFFT 的 --version 會寫到 stderr，若每次容器啟動都印這段歡迎訊息，
# 後端會把這行 stderr 誤判為 pipeline 執行失敗（詳見 pythonExecutor.js 的修正）。
RUN echo '#!/bin/bash\n\
    if [ $# -eq 0 ]; then\n\
    echo "🧬 DNA 分析環境已準備就緒"\n\
    echo ""\n\
    echo "可用工具:"\n\
    echo "  Python: $(python --version)"\n\
    echo "  BLAST: $(blastn -version | head -1)"\n\
    echo "  MAFFT: $(mafft --version 2>&1)"\n\
    echo "  FLASH: $(flash -v 2>&1 | head -1 || echo \"FLASH 未找到\")"\n\
    echo ""\n\
    echo "系統資訊:"\n\
    echo "  架構: $(uname -m)"\n\
    echo "  作業系統: $(uname -s)"\n\
    echo ""\n\
    echo "目錄:"\n\
    echo "  📁 /app/data   - 放入您的數據檔案"\n\
    echo "  📁 /app/output - 分析結果輸出"\n\
    echo "  📁 /app/scripts - 您的 Python 程式"\n\
    echo ""\n\
    echo "進入互動模式..."\n\
    /bin/bash\n\
    else\n\
    exec "$@"\n\
    fi\n\
    ' > /app/start.sh && chmod +x /app/start.sh

# 設定掛載點
VOLUME ["/app/data", "/app/output", "/app/scripts"]

# 設定入口點
ENTRYPOINT ["/app/start.sh"] 