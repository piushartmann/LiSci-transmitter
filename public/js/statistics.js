document.addEventListener('DOMContentLoaded', async function () {
    const allCitationsChart = document.getElementById('allCitations');

    const mostCitations = await (await fetch('internal/statistics/mostCitations')).json()

    new Chart(allCitationsChart, {
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
            }
        }
    });

    drawCitationsOverTimeChart("");
});


const citationsOverTimeChart = document.getElementById('citationsOverTime');
let citationsOverTimeChartInstance = null;

async function drawCitationsOverTimeChart(user) {

    if (citationsOverTimeChartInstance) {
        citationsOverTimeChartInstance.destroy();
    }

    const citationsByMonth = await (await fetch(`internal/statistics/citationsOverTime?user=${user}`)).json();

    console.log(citationsByMonth);

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
            }
        }
    });
}