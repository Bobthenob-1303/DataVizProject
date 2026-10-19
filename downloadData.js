// getData.js
// -----------------------------------------------------------
// What this script does:
//   1. Finds the 2024 Belgium Qualifying session on OpenF1
//   2. For each driver, finds their FASTEST lap
//   3. Downloads the car data (RPM, brake) for just that lap
//   4. Saves everything into a file called data.json
//
// How to run it (needs Node.js 18 or newer):
//   node getData.js
// -----------------------------------------------------------

// This lets us save a file on our computer
const fs = require("fs");

// ---------- Settings you can change ----------

const YEAR = 2024;
const COUNTRY = "Belgium";
const SESSION_NAME = "Qualifying";

const DRIVERS = [
    { name: "Max Verstappen", number: 1 },
    { name: "Lando Norris", number: 4 },
    { name: "Charles Leclerc", number: 16 }
];

// ---------- Helper functions ----------

// Pauses the script for a short time.
// The API limits how fast we can ask for data, so we wait between requests.
function wait(milliseconds) {
    return new Promise(function (resolve) {
        setTimeout(resolve, milliseconds);
    });
}

// Goes through a list of laps and returns the fastest one.
// Laps with missing data (null) are skipped.
// Returns null if there are no usable laps.
function findFastestLap(laps) {
    let fastestLap = null;

    for (let i = 0; i < laps.length; i++) {
        let lap = laps[i];

        // Skip laps that are missing a time or a start date
        if (lap.lap_duration === null || lap.date_start === null) {
            continue;
        }

        // If this is our first good lap, or it's faster than the best so far, keep it
        if (fastestLap === null || lap.lap_duration < fastestLap.lap_duration) {
            fastestLap = lap;
        }
    }

    return fastestLap;
}

// ---------- Main function ----------

async function getData() {

    // STEP 1: Find the session -----------------------------------

    let sessionUrl =
        "https://api.openf1.org/v1/sessions" +
        "?year=" + YEAR +
        "&country_name=" + COUNTRY +
        "&session_name=" + SESSION_NAME;

    let sessionResponse = await fetch(sessionUrl);
    let sessions = await sessionResponse.json();

    // The API returns a list. We only need the first session in it.
    let session = sessions[0];
    let sessionKey = session.session_key;

    console.log("Circuit:", session.circuit_short_name);
    console.log("Session:", session.session_name);
    console.log("Session Key:", sessionKey);

    // This list will hold the final results for all drivers
    let output = [];

    // STEP 2: Loop through each driver ---------------------------

    for (let i = 0; i < DRIVERS.length; i++) {

        let driver = DRIVERS[i];

        console.log("-------------------------");
        console.log("Getting laps for", driver.name);

        // STEP 3: Get all of this driver's laps ------------------

        let lapsUrl =
            "https://api.openf1.org/v1/laps" +
            "?session_key=" + sessionKey +
            "&driver_number=" + driver.number;

        let lapsResponse = await fetch(lapsUrl);
        let laps = await lapsResponse.json();

        // If the API gave us an error instead of a list, skip this driver
        if (!Array.isArray(laps)) {
            console.log("Could not get laps for", driver.name);
            console.log(laps);
            continue;
        }

        // STEP 4: Find the fastest lap ---------------------------

        let fastestLap = findFastestLap(laps);

        if (fastestLap === null) {
            console.log("No valid laps found for", driver.name);
            continue;
        }

        console.log(driver.name, "Fastest Lap:", fastestLap.lap_duration);

        // STEP 5: Work out when the lap started and ended --------

        let startTime = new Date(fastestLap.date_start);

        // lap_duration is in seconds, but JavaScript dates use milliseconds,
        // so we multiply by 1000.
        let endTime = new Date(startTime.getTime() + fastestLap.lap_duration * 1000);

        await wait(500); // short pause before the next request

        // STEP 6: Download car data for just that lap ------------

        let carUrl =
            "https://api.openf1.org/v1/car_data" +
            "?session_key=" + sessionKey +
            "&driver_number=" + driver.number +
            "&date>=" + startTime.toISOString() +
            "&date<=" + endTime.toISOString();

        let carResponse = await fetch(carUrl);
        let carData = await carResponse.json();

        if (!Array.isArray(carData)) {
            console.log("Could not get car data for", driver.name);
            console.log(carData);
            continue;
        }

        // STEP 7: Keep only the fields we care about -------------

        let telemetry = [];

        for (let j = 0; j < carData.length; j++) {
            let point = carData[j];

            telemetry.push({
                driver_number: point.driver_number,
                date: point.date,
                rpm: point.rpm,
                brake: point.brake
            });
        }

        // STEP 8: Add this driver's results to the output --------

        output.push({
            driver: driver.name,
            driver_number: driver.number,
            lap_number: fastestLap.lap_number,
            lap_time: fastestLap.lap_duration,
            telemetry: telemetry
        });

        await wait(1000); // pause before moving to the next driver
    }

    // STEP 9: Save everything to data.json -----------------------

    // The "null, 2" part makes the file nicely indented and easy to read
    let jsonText = JSON.stringify(output, null, 2);
    fs.writeFileSync("./data.json", jsonText);

    console.log("-------------------------");
    console.log("data.json created");
}

// Start the script
getData();