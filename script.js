document.addEventListener('DOMContentLoaded', () => {
    const estimateInput = document.getElementById('medianEstimate');
    const unitSelect = document.getElementById('unit');
    const generateButton = document.getElementById('generateGraph');
    const ctx = document.getElementById('logNormalChart').getContext('2d');
    const graphDescription = document.getElementById('graphDescription'); // Get the description paragraph

    // Get percentile list item elements
    const p50Element = document.getElementById('p50Value');
    const p75Element = document.getElementById('p75Value');
    const p90Element = document.getElementById('p90Value');
    const p99Element = document.getElementById('p99Value');
    const meanElement = document.getElementById('meanValue'); // Get the Mean list item element


    let logNormalChart; // Variable to hold the chart instance

    // Constants derived from the blog post analysis
    // sigma = sqrt(2 * ln(1.6))
    const SIGMA = Math.sqrt(2 * Math.log(1.6));

    // Z-scores for key percentiles (approximate values from standard normal distribution table)
    const Z_50 = 0;
    const Z_75 = 0.67449;
    const Z_90 = 1.28155;
    const Z_99 = 2.32635;


    // Function to convert input value to hours
    function convertToHours(value, unit) {
        switch (unit) {
            case 'days':
                return value * 24;
            case 'hours':
                return value;
            case 'minutes':
                return value / 60;
            default:
                return value; // Default to hours if unit is unknown
        }
    }

    // Function to convert value from hours to target unit
    function convertFromHours(valueInHours, targetUnit) {
        switch (targetUnit) {
            case 'days':
                return valueInHours / 24;
            case 'hours':
                return valueInHours;
            case 'minutes':
                return valueInHours * 60;
            default:
                return valueInHours; // Default to hours
        }
    }

    // Function to calculate the Probability Density Function (PDF) of a log-normal distribution
    // x: the value (completion time) - MUST BE IN HOURS for calculation
    // mu: the mean of the underlying normal distribution (ln(median))
    // sigma: the standard deviation of the underlying normal distribution
    function logNormalPDF(x, mu, sigma) {
        if (x <= 0) {
            return 0;
        }
        const term1 = 1 / (x * sigma * Math.sqrt(2 * Math.PI));
        const term2 = Math.exp(-Math.pow(Math.log(x) - mu, 2) / (2 * Math.pow(sigma, 2)));
        return term1 * term2;
    }

    // Function to generate data points for the graph
    // median is expected to be in the base unit (hours)
    // targetUnit is the unit the user selected for display
    function generateGraphData(medianInHours, targetUnit) {
        const mu = Math.log(medianInHours);
        const dataPoints = [];
        const numPoints = 200; // Number of points to plot

        // Determine the range for the x-axis in HOURS. Clip to roughly the 99th percentile (P99).
        const maxX_hours = medianInHours * Math.exp(SIGMA * Z_99); // m * exp(sigma * Z_0.99)

        // Start slightly above zero in HOURS to avoid issues with log(0) and division by zero
        const startX_hours = Math.max(0.01, medianInHours * 0.001); // Start at 0.1 or 0.1% of median, whichever is larger

        for (let i = 0; i < numPoints; i++) {
            // Calculate the time point in HOURS
            const x_hours = startX_hours + (maxX_hours - startX_hours) * (i / (numPoints - 1));
            // Calculate the PDF value (density) using the value in HOURS
            const y = logNormalPDF(x_hours, mu, SIGMA);

            // Convert the time point to the target display unit for the chart data
            const x_unit = convertFromHours(x_hours, targetUnit);

            dataPoints.push({ x: x_unit, y: y });
        }
        return dataPoints;
    }

    // Function to draw or update the chart
    // medianInHours is the median value in the base unit (hours)
    // inputMedian and inputUnit are the values entered by the user for display purposes
    function drawChart(dataPoints, medianInHours, inputMedian, inputUnit) {
        const meanInHours = medianInHours * 1.6;

        // Destroy existing chart if it exists
        if (logNormalChart) {
            logNormalChart.destroy();
        }

        // Update the description text
        graphDescription.innerHTML = `This graph shows the probability distribution of actual completion times in <strong>${inputUnit.toLowerCase()}</strong>, given your estimated median time (m) in the selected unit.`;

        // Calculate percentile values in hours using the log-normal formula: exp(mu + sigma * Z_p)
        // Since mu = ln(medianInHours), this is medianInHours * exp(sigma * Z_p)
        const p50InHours = medianInHours * Math.exp(SIGMA * Z_50);
        const p75InHours = medianInHours * Math.exp(SIGMA * Z_75);
        const p90InHours = medianInHours * Math.exp(SIGMA * Z_90);
        const p99InHours = medianInHours * Math.exp(SIGMA * Z_99);

        // Convert percentile values and mean to the selected input unit
        const p50InUnit = convertFromHours(p50InHours, inputUnit);
        const p75InUnit = convertFromHours(p75InHours, inputUnit);
        const p90InUnit = convertFromHours(p90InHours, inputUnit);
        const p99InUnit = convertFromHours(p99InHours, inputUnit);
        const meanInUnit = convertFromHours(meanInHours, inputUnit); // Convert mean to selected unit

        // Update the percentile list items with calculated values
        p50Element.innerHTML = `P50 (Median): ${p50InUnit.toFixed(2)} ${inputUnit.toLowerCase()}`;
        p75Element.innerHTML = `P75: ${p75InUnit.toFixed(2)} ${inputUnit.toLowerCase()}`;
        p90Element.innerHTML = `P90: ${p90InUnit.toFixed(2)} ${inputUnit.toLowerCase()}`;
        p99Element.innerHTML = `P99: ${p99InUnit.toFixed(2)} ${inputUnit.toLowerCase()}`;
        meanElement.innerHTML = `Mean (Average): ${meanInUnit.toFixed(2)} ${inputUnit.toLowerCase()}`; // Update Mean list item


        logNormalChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `Probability Density (Median = ${inputMedian} ${inputUnit})`,
                    data: dataPoints, // Data points now have x-values in the selected unit
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.2)',
                    fill: true,
                    tension: 0.4, // Smooth the curve
                    pointRadius: 0 // Hide data points
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            // Update x-axis title to reflect selected unit
                            text: `Completion Time (${inputUnit.charAt(0).toUpperCase() + inputUnit.slice(1)})`
                        },
                        min: 0 // Ensure x-axis starts at 0
                    },
                    y: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Probability Density'
                        },
                        min: 0 // Ensure y-axis starts at 0
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                // Tooltip shows time in the selected unit (context.parsed.x is already in that unit)
                                label += `Time: ${context.parsed.x.toFixed(2)} ${inputUnit.toLowerCase()}, Density: ${context.parsed.y.toExponential(2)}`;
                                return label;
                            }
                        }
                    },
                     annotation: {
                        annotations: {
                            medianLine: {
                                type: 'line',
                                // Annotation x-value should be in the selected unit
                                xMin: convertFromHours(medianInHours, inputUnit),
                                xMax: convertFromHours(medianInHours, inputUnit),
                                borderColor: 'rgba(255, 99, 132, 0.8)',
                                borderWidth: 2,
                                // Annotation label shows median in the selected unit
                                label: {
                                    content: `Median (${convertFromHours(medianInHours, inputUnit).toFixed(2)} ${inputUnit.toLowerCase()})`,
                                    enabled: true,
                                    position: 'top'
                                }
                            },
                             meanLine: {
                                type: 'line',
                                // Annotation x-value should be in the selected unit
                                xMin: convertFromHours(meanInHours, inputUnit),
                                xMax: convertFromHours(meanInHours, inputUnit),
                                borderColor: 'rgba(255, 159, 64, 0.8)',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                // Annotation label shows mean in the selected unit
                                label: {
                                    content: `Mean (${convertFromHours(meanInHours, inputUnit).toFixed(2)} ${inputUnit.toLowerCase()})`,
                                    enabled: true,
                                    position: 'top'
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    // Event listener for the button
    generateButton.addEventListener('click', () => {
        const inputMedian = parseFloat(estimateInput.value);
        const inputUnit = unitSelect.value;

        if (isNaN(inputMedian) || inputMedian <= 0) {
            alert('Please enter a valid positive number for the median estimate.');
            return;
        }

        const medianInHours = convertToHours(inputMedian, inputUnit);
        // Pass the selected unit to generateGraphData
        const dataPoints = generateGraphData(medianInHours, inputUnit);
        // Pass original input and unit to drawChart
        drawChart(dataPoints, medianInHours, inputMedian, inputUnit);
    });

    // Generate initial graph on page load with default value (30 minutes)
    const initialInputMedian = parseFloat(estimateInput.value);
    const initialInputUnit = unitSelect.value; // Get default unit
    if (!isNaN(initialInputMedian) && initialInputMedian > 0) {
         const initialMedianInHours = convertToHours(initialInputMedian, initialInputUnit);
         // Pass the selected unit to generateGraphData for initial load
         const dataPoints = generateGraphData(initialMedianInHours, initialInputUnit);
         // Pass original input and unit to drawChart for initial load
         drawChart(dataPoints, initialMedianInHours, initialInputMedian, initialInputUnit);
    }
});
