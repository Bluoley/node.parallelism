const { Readable } = require("stream");
const { parse } = require("csv-parse");
const { Worker } = require("worker_threads");
const redisClient = require("../config/redis");
// const os = require("os");

const reportWeather = async (req, res) => {
  console.log("####");
  const file = req.file;
  if (!file) {
    return res.status(404).json({
      error: "file required",
    });
  }

  try {
    const dups = await handleData(file);
    const flightArray = [...dups.values()];
    // const cpuCount = os.cpus().length;
    const cpuCount = 4;
    const size = flightArray.length > 200 ? flightArray.length / cpuCount : 100;
    const chunks = chunk(flightArray, size);
    const resultArray = [];
    const workerPromises = chunks.map((element) => {
      return new Promise((resolve, reject) => {
        const worker = new Worker("./services/weather.js", {
          workerData: element,
        });

        worker.on("message", (weatherFlights) => {
          resultArray.push(weatherFlights);
          resolve();
        });

        worker.on("error", (error) => {
          console.error("Worker error:", error);
          reject(error);
        });

        worker.on("exit", (code) => {
          if (code !== 0) {
            console.error(`Worker ended, code: ${code}`);
            reject(new Error(`Worker ended, code: ${code}`));
          } else {
            console.log(`Worker successfully completed.`);
          }
        });
      });
    });

    try {
      await Promise.all(workerPromises);
      return res.status(200).json({
        resultArray,
      });
    } catch (error) {
      console.error("Error processing workers:", error);
      return res.status(500).json({ error: "Error processing data." });
    }
  } catch (error) {
    return res.status(500).json({ error: "Error processing file" });
  }
};

const chunk = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

const handleData = (file) => {
  const dups = new Map();
  const bufferStream = new Readable();
  bufferStream.push(file.buffer);
  bufferStream.push(null);

  return new Promise((resolve, reject) => {
    bufferStream
      .pipe(parse({ delimiter: ",", columns: true }))
      .on("data", async (row) => {
        if (!dups.has(row.flight_num)) {
          dups.set(row.flight_num, row);
        }
      })
      .on("end", () => {
        resolve(dups);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

const getIataKeys = async (req, res) => {
  // Esto es incorrecto, ya que no puedo obtener todas las keys asi como si nada, esto es solo para la prueba.
  // Las keys de IATA CODE tienen que tener un identificador para obtenerlas de esta forma.
  try {
    const iataKeys = await redisClient.keys("*");
    return res.status(200).json({ iataKeys });
  } catch (error) {
    return res.status(500).json({ error: "Error getting cache keys" });
  }
};

module.exports = {
  reportWeather,
  getIataKeys
};
