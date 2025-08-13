"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsData {
  metric: string;
  value: number;
}

export function StatsSection() {
  const [stats, setStats] = useState<StatsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatsAndUser();
  }, []);

  const fetchStatsAndUser = async () => {
    try {
      const statsResponse = await fetch("/api/stats");
      if (statsResponse.ok) {
        const { stats } = await statsResponse.json();
        setStats(stats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || stats.length === 0) {
    return null;
  }

  const maxValue = Math.max(...stats.map((item) => item.value));
  const yAxisMax = Math.ceil(maxValue * 1.1);

  return (
    <section className="py-16 bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Platform Statistics
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Real-time metrics showing Gumboard&apos;s growth and usage
          </p>
        </div>

        <Card className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Usage Metrics
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Overview of platform activity and growth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="metric"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    className="text-xs"
                  />
                  <YAxis domain={[0, yAxisMax]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.metric}
              className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700"
            >
              <CardHeader className="pb-2">
                <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                  {stat.metric}
                </CardDescription>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
