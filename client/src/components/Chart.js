import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Chart as ReactChart } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const Chart = ({ type, data, options, height = 300 }) => {
  const chartRef = useRef(null);

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#6b7280'
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          color: '#6b7280'
        }
      }
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderSkipped: false
      },
      line: {
        tension: 0.4
      },
      point: {
        radius: 4,
        hoverRadius: 6
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    },
    ...options
  };

  const chartData = {
    ...data,
    datasets: data.datasets?.map(dataset => ({
      ...dataset,
      borderWidth: dataset.borderWidth || 0,
      borderColor: dataset.borderColor || dataset.backgroundColor,
      hoverBorderWidth: dataset.hoverBorderWidth || 2,
      hoverBorderColor: dataset.hoverBorderColor || dataset.backgroundColor
    }))
  };

  return (
    <div style={{ height: `${height}px` }}>
      <ReactChart
        ref={chartRef}
        type={type}
        data={chartData}
        options={defaultOptions}
      />
    </div>
  );
};

export default Chart;
