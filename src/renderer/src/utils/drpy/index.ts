import Worker from '@/utils/drpy/worker?worker';   

let worker = new Worker();

const doWork = (data) => {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      const response = event.data;
      console.log(response)
      resolve(response);
    };

    worker.onerror = (error) => {
      reject(error);
    };

    worker.postMessage(data);
  });
}

const terminateWork = () => {
  return new Promise((resolve, reject) => {
    if (typeof worker !== 'undefined' && worker !== null) {
      worker.terminate();
      worker = new Worker(); // 重新创建
      resolve({
        msg: 'Worker terminated successfully.',
        code: 200
      });
    } else {
      reject({
        msg: new Error('Worker is not defined or already terminated.'),
        code: 500
      });
    }
  });
};

export { doWork, terminateWork };