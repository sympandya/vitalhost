import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register the required Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

interface TelemetryChartProps {
  title: string;
  labels: string[];
  dataPoints: number[];
  borderColor: string;
  backgroundColor: string;
  yAxisMax?: number;
}

export function TelemetryChart({ title, labels, dataPoints, borderColor, backgroundColor, yAxisMax }: TelemetryChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label: title,
        data: dataPoints,
        borderColor: borderColor,
        backgroundColor: backgroundColor,
        borderWidth: 2,
        pointRadius: 0, // Hides the dots to make the line look like a smooth heartbeat
        fill: true,
        tension: 0.4, // Adds a slight curve to the line
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0, // Disables animation so it updates instantly at 1Hz without lagging
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)', maxTicksLimit: 10 },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)' },
        beginAtZero: true,
        max: yAxisMax,
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }, // Turn off tooltips for raw performance
    },
  };

  return (
    <div className="w-full h-48">
      <Line data={data} options={options} />
    </div>
  );
}