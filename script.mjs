// chart.js
// -----------------------------------------------------------
// What this script does:
//   1. Loads data.json (created by getData.js)
//   2. Turns each driver's RPM readings into points on a graph
//   3. Draws a line chart using Chart.js
//
// Your HTML page needs:
//   <canvas id="myChart"></canvas>
//   <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
//   <script src="chart.js"></script>
// -----------------------------------------------------------

// One line color per driver (first driver = blue, second = orange, ...)
const LINE_COLORS = ["blue", "orange", "red"];

// Turns one driver's telemetry into a list of {x, y} points.
//   x = seconds since the start of the lap
//   y = engine RPM
function buildPoints(telemetry) {
    let points = [];

    // Every x value is measured from the very first reading
    let startTime = new Date(telemetry[0].date);

    for (let i = 0; i < telemetry.length; i++) {
        let reading = telemetry[i];

        let currentTime = new Date(reading.date);

        // Subtracting two dates gives milliseconds, so divide by 1000 for seconds
        let secondsIntoLap = (currentTime - startTime) / 1000;

        points.push({
            x: secondsIntoLap,
            y: reading.rpm
        });
    }

    return points;
}

async function makeChart() {

    // STEP 1: Load the JSON file ---------------------------------

    let response = await fetch("./data.json");
    let drivers = await response.json();

    // STEP 2: Build one dataset (one line) per driver ------------

    let datasets = [];

    for (let i = 0; i < drivers.length; i++) {

        let driver = drivers[i];

        datasets.push({
            label: driver.driver,                    // name shown in the legend
            data: buildPoints(driver.telemetry),     // the points on the line
            borderColor: LINE_COLORS[i],             // line color
            borderWidth: 2,                          // line thickness
            pointRadius: 0                           // hide the dots, show only the line
        });
    }

    // STEP 3: Find the <canvas> element on the page --------------

    let canvas = document.getElementById("myChart");

    // STEP 4: Draw the chart -------------------------------------

    new Chart(canvas, {
        type: "line",

        data: {
            datasets: datasets
        },

        options: {
            scales: {
                // Horizontal axis
                x: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "Time (seconds)"
                    }
                },

                // Vertical axis
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Engine RPM"
                    }
                }
            }
        }
    });
}

// Start the script
makeChart();