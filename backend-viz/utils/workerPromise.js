const { Worker } = require("worker_threads");
const path = require("path");

function runWorker(workerPath, workerData, opts = {}) {
  const resolvedPath = path.resolve(__dirname, "..", workerPath);
  return new Promise((resolve, reject) => {
    const worker = new Worker(resolvedPath, { workerData });
    const timeout = opts.timeout || 30000;
    let timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Worker timeout"));
    }, timeout);

    worker.once("message", (msg) => {
      clearTimeout(timer);
      resolve(msg);
      worker.terminate();
    });

    worker.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
      worker.terminate();
    });

    worker.once("exit", (code) => {
      if (code !== 0) {
        // if neither message nor error fired
        clearTimeout(timer);
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}

module.exports = { runWorker };
