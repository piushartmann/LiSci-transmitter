let timespan = "";

document.addEventListener('DOMContentLoaded', async function () {
    updateMostCited();
    updateTotalCitations();
    drawCitationsOverTimeChart("");

    const timespanSelector = document.getElementById('timespanSelector');
    timespanSelector.addEventListener('change', async () => {
        timespan = timespanSelector.value;
        updateMostCited();
        updateTotalCitations();
        drawCitationsOverTimeChart("");
    });


    window.addEventListener('resize', () => {
        for (let id in Chart.instances) {
            Chart.instances[id].resize();
        }
    });

});

const mostCitedChart = document.getElementById('mostCited');
let mostCitedChartInstance = null;

async function updateMostCited() {
    if (mostCitedChartInstance) {
        mostCitedChartInstance.destroy();
    }

    const mostCited = await (await fetch(`internal/statistics/mostCited?timespan=${timespan || ""}`)).json()

    mostCitedChartInstance = new Chart(mostCitedChart, {
        type: 'bar',
        data: {
            labels: mostCited.map(c => c._id),
            datasets: [{
                label: 'Number of Citations Received per User',
                data: mostCited.map(c => c.count),
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
        }
    });
}

const allCitationsChart = document.getElementById('allCitations');
let allCitationsChartInstance = null;

async function updateTotalCitations() {

    if (allCitationsChartInstance) {
        allCitationsChartInstance.destroy();
    }

    const mostCitations = await (await fetch(`internal/statistics/mostCitations?timespan=${timespan || ""}`)).json()

    allCitationsChartInstance = new Chart(allCitationsChart, {
        type: 'bar',
        data: {
            labels: mostCitations.map(c => c.username),
            datasets: [{
                label: 'Number of Citations per User',
                data: mostCitations.map(c => c.count),
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            interaction: {
                mode: 'index'
            },
            onClick: async (e) => {
                const activePoints = e.chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
                if (activePoints.length) {
                    const index = activePoints[0].index;
                    const username = mostCitations[index].username;
                    drawCitationsOverTimeChart(username);
                }
            },
        }
    });

}


const citationsOverTimeChart = document.getElementById('citationsOverTime');
let citationsOverTimeChartInstance = null;

async function drawCitationsOverTimeChart(user) {

    if (citationsOverTimeChartInstance) {
        citationsOverTimeChartInstance.destroy();
    }

    const citationsByMonth = await (await fetch(`internal/statistics/citationsOverTime?user=${user}&timespan=${timespan || ""}`)).json();

    citationsOverTimeChartInstance = new Chart(citationsOverTimeChart, {
        type: 'line',
        data: {
            labels: citationsByMonth.map(c => c._id),
            datasets: [{
                label: 'Number of Citations Over Time' + (user ? ` for ${user}` : ''),
                data: citationsByMonth.map(c => c.count),
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            quarter: 'MMM YYYY'
                        }
                    }
                }
            },
        }
    });
}