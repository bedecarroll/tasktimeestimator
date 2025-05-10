document.addEventListener('DOMContentLoaded', () => {
    const estimateInput = document.getElementById('medianEstimate');
    const unitSelect = document.getElementById('unit');
    const generateButton = document.getElementById('generateGraph');
    const ctx = document.getElementById('logNormalChart').getContext('2d');
    const graphDescription = document.getElementById('graphDescription'); // Get the description paragraph

    // Get percentile list item elements
    const p50Element = document.getElementById('p50Value');
    const meanElement = document.getElementById('meanValue'); // Get the Mean list item element
    const p80Element = document.getElementById('p80Value');
    const p90Element = document.getElementById('p90Value');
    const p95Element = document.getElementById('p95Value');
    const p99Element = document.getElementById('p99Value');


    let logNormalChart; // Variable to hold the chart instance

    // Sigma for the underlying normal distribution (ln(Time) ~ N(ln(m), SIGMA^2))
    // Based on the blog post's "shape factor of 1" and mean = m * exp(1/2)
    const SIGMA = 1.0;

    // Z-scores for key percentiles (from standard normal distribution table)
    const Z_50 = 0; // Corresponds to the median
    const Z_99 = 2.32635; // Standard Z-score for 99th percentile, used for graph x-axis limit


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
    // medianInHours is expected to be in the base unit (hours)
    // targetUnit is the unit the user selected for display
    function generateGraphData(medianInHours, targetUnit) {
        const mu = Math.log(medianInHours); // mu_ln = ln(median)
        const dataPoints = [];
        const numPoints = 200; // Number of points to plot

        // Determine the range for the x-axis in HOURS.
        // Extend to the true 99th percentile of the distribution with SIGMA=1
        const maxX_hours = medianInHours * Math.exp(SIGMA * Z_99); // m * exp(1 * Z_0.99)

        // Start slightly above zero in HOURS to avoid issues with log(0) and division by zero
        const startX_hours = Math.max(0.01, medianInHours * 0.001);

        for (let i = 0; i < numPoints; i++) {
            const x_hours = startX_hours + (maxX_hours - startX_hours) * (i / (numPoints - 1));
            const y = logNormalPDF(x_hours, mu, SIGMA);
            const x_unit = convertFromHours(x_hours, targetUnit);
            dataPoints.push({ x: x_unit, y: y });
        }
        return dataPoints;
    }

    // Function to draw or update the chart
    // medianInHours is the median value in the base unit (hours)
    // inputMedian and inputUnit are the values entered by the user for display purposes
    function drawChart(dataPoints, medianInHours, inputMedian, inputUnit) {
        // Calculate mean based on SIGMA=1: mean = median * exp(SIGMA^2 / 2)
        const meanInHours = medianInHours * Math.exp(SIGMA * SIGMA / 2); // m * exp(0.5)

        if (logNormalChart) {
            logNormalChart.destroy();
        }

        // Percentile calculations based on blog post's communication guidelines
        const p50InHours = medianInHours; // P50 is the median
        const p80InHours = medianInHours * 3;   // P80 = m * 3
        const p90InHours = medianInHours * 4;   // P90 = m * 4
        const p95InHours = medianInHours * 5;   // P95 = m * 5
        const p99InHours = medianInHours * 7;   // P99 = m * 7 (communication guideline)


        // Convert percentile values and mean to the selected input unit
        const p50InUnit = convertFromHours(p50InHours, inputUnit);
        const meanInUnit = convertFromHours(meanInHours, inputUnit);
        const p80InUnit = convertFromHours(p80InHours, inputUnit);
        const p90InUnit = convertFromHours(p90InHours, inputUnit);
        const p95InUnit = convertFromHours(p95InHours, inputUnit);
        const p99InUnit = convertFromHours(p99InHours, inputUnit);

        // Update the percentile list items with calculated values
        p50Element.innerHTML = `P50 (Median): ${p50InUnit.toFixed(2)} ${inputUnit.toLowerCase()}`;
        meanElement.innerHTML = `Mean (Average): ${meanInUnit.toFixed(2)} ${inputUnit.toLowerCase()} (≈${(meanInHours/medianInHours).toFixed(2)} * m)`;
        p80Element.innerHTML = `P80: ${p80InUnit.toFixed(2)} ${inputUnit.toLowerCase()} (m * 3)`;
        p90Element.innerHTML = `P90: ${p90InUnit.toFixed(2)} ${inputUnit.toLowerCase()} (m * 4)`;
        p95Element.innerHTML = `P95: ${p95InUnit.toFixed(2)} ${inputUnit.toLowerCase()} (m * 5)`;
        p99Element.innerHTML = `P99: ${p99InUnit.toFixed(2)} ${inputUnit.toLowerCase()} (m * 7)`;


        logNormalChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: `Probability Density (Median = ${inputMedian} ${inputUnit}, σ_ln = ${SIGMA.toFixed(1)})`,
                    data: dataPoints,
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
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
                            text: `Completion Time (${inputUnit.charAt(0).toUpperCase() + inputUnit.slice(1)})`
                        },
                        min: 0
                    },
                    y: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Probability Density'
                        },
                        min: 0
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
                                label += `Time: ${context.parsed.x.toFixed(2)} ${inputUnit.toLowerCase()}, Density: ${context.parsed.y.toExponential(2)}`;
                                return label;
                            }
                        }
                    },
                     annotation: {
                        annotations: {
                            medianLine: {
                                type: 'line',
                                xMin: p50InUnit,
                                xMax: p50InUnit,
                                borderColor: 'rgba(255, 99, 132, 0.8)', // Red
                                borderWidth: 2,
                                label: {
                                    content: `Median (P50: ${p50InUnit.toFixed(2)})`,
                                    enabled: true,
                                    position: 'top',
                                    backgroundColor: 'rgba(255, 99, 132, 0.7)'
                                }
                            }
                            // Removed meanLine, p80Line, p90Line, p95Line, p99Line
                        }
                    }
                }
            }
        });
    }

    generateButton.addEventListener('click', () => {
        const inputMedian = parseFloat(estimateInput.value);
        const inputUnit = unitSelect.value;

        if (isNaN(inputMedian) || inputMedian <= 0) {
            alert('Please enter a valid positive number for the median estimate.');
            return;
        }

        const medianInHours = convertToHours(inputMedian, inputUnit);
        const dataPoints = generateGraphData(medianInHours, inputUnit);
        drawChart(dataPoints, medianInHours, inputMedian, inputUnit);
    });

    // Initial graph generation on page load
    const initialInputMedian = parseFloat(estimateInput.value);
    const initialInputUnit = unitSelect.value;
    if (!isNaN(initialInputMedian) && initialInputMedian > 0) {
         const initialMedianInHours = convertToHours(initialInputMedian, initialInputUnit);
         const dataPoints = generateGraphData(initialMedianInHours, initialInputUnit);
         drawChart(dataPoints, initialMedianInHours, initialInputMedian, initialInputUnit);
    }
});
