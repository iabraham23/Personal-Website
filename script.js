const weatherIcon = document.getElementById("weather-icon");
const weatherSummary = document.getElementById("weather-summary");
const weatherStates = ["weather-sun", "weather-rain", "weather-cloud", "weather-night"];

const weatherAssets = {
    sun: {
        src: "assets/weather-sun.svg",
        alt: "Sunny weather"
    },
    rain: {
        src: "assets/weather-rain.svg",
        alt: "Rainy weather"
    },
    cloud: {
        src: "assets/weather-cloud.svg",
        alt: "Cloudy weather"
    },
    night: {
        src: "assets/weather-moon.svg",
        alt: "Night weather"
    }
};

const rainyWeatherCodes = new Set([
    51, 53, 55, 56, 57, 61, 63, 65, 66, 67,
    71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99
]);

const cloudyWeatherCodes = new Set([1, 2, 3, 45, 48]);

function getWeatherState(current) {
    if (Number(current.is_day) === 0) {
        return "night";
    }

    const code = Number(current.weather_code);
    const precipitation = Number(current.precipitation || 0);
    const rain = Number(current.rain || 0);
    const showers = Number(current.showers || 0);

    if (rainyWeatherCodes.has(code) || precipitation > 0 || rain > 0 || showers > 0) {
        return "rain";
    }

    if (cloudyWeatherCodes.has(code) || Number(current.cloud_cover || 0) > 35) {
        return "cloud";
    }

    return "sun";
}

function getWeatherLabel(state) {
    if (state === "rain") {
        return "Rainy";
    }

    if (state === "cloud") {
        return "Cloudy";
    }

    if (state === "night") {
        return "Night";
    }

    return "Sunny";
}

function setWeatherState(state) {
    document.body.classList.remove(...weatherStates);

    if (state) {
        document.body.classList.add(`weather-${state}`);
    }
}

async function loadPortlandWeather() {
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.search = new URLSearchParams({
        latitude: "45.5152",
        longitude: "-122.6784",
        current: [
            "temperature_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "rain",
            "showers",
            "weather_code",
            "cloud_cover",
            "wind_speed_10m",
            "relative_humidity_2m"
        ].join(","),
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        precipitation_unit: "inch",
        timezone: "America/Los_Angeles"
    }).toString();

    try {
        const response = await fetch(weatherUrl);

        if (!response.ok) {
            throw new Error("Unable to load Portland weather.");
        }

        const payload = await response.json();
        const current = payload.current;

        if (!current) {
            throw new Error("Portland weather is unavailable.");
        }

        const state = getWeatherState(current);
        const asset = weatherAssets[state];
        const temperature = Math.round(Number(current.temperature_2m));
        const label = getWeatherLabel(state);

        weatherIcon.src = asset.src;
        weatherIcon.alt = asset.alt;
        weatherSummary.textContent = `Portland ${temperature}°F, ${label}`;
        weatherIcon.closest(".weather-widget").hidden = false;
        setWeatherState(state);
    } catch (error) {
        weatherIcon.closest(".weather-widget").hidden = true;
        weatherSummary.textContent = "";
        setWeatherState(null);
    }
}

document.addEventListener("DOMContentLoaded", loadPortlandWeather);
