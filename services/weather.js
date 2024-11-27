const { parentPort, workerData, isMainThread } = require("worker_threads");
const redisClient = require("../config/redis");
const axios = require("axios");

const APIKEY = "";
let cache = {};

const fetchWeather = async (code_city, key) => {
  try {
    const cache = await redisClient.get(code_city);
    if (cache) {
      return JSON.parse(cache);
    }
  } catch (error) {
    console.log("redis error:", error);
  }
  try {
    const response = await axios.get(`
        https://api.openweathermap.org/data/2.5/weather?lat=${key.lat}&lon=${key.lon}&appid=${APIKEY}`);
    const weatherData = response.data;
    await redisClient.set(code_city, JSON.stringify(weatherData));
    return weatherData;
  } catch (error) {
    console.log("🚀 ~ fetchWeather ~ error:", error);
    throw new Error("Error fetching weather api");
  }
};

const process = async () => {
  try {
    const promise = workerData.map(async (flight) => {
      const origin = await fetchWeather(flight.origin, {
        lat: flight.origin_latitude,
        lon: flight.origin_longitude,
      });
      const destination = await fetchWeather(flight.destination, {
        lat: flight.destination_latitude,
        lon: flight.destination_longitude,
      });
      flight.weather = {
        origin,
        destination,
      };
      return flight;
    });

    const result = await Promise.all(promise);
    parentPort.postMessage(result);
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
};

if (!isMainThread) {
  process();
}
