"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface WeeklyStatsData {
  week: string;
  weekStart: string;
  boardsCreated: number;
  usersCreated: number;
  orgsCreated: number;
  notesCreated: number;
  checklistItemsCreated: number;
}

interface TotalsData {
  totalUsers: number;
  totalOrgs: number;
  totalBoards: number;
  totalNotes: number;
  totalChecklistItems: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: WeeklyStatsData;
  }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-zinc-800 p-3 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">Week of {label}</p>
        <div className="space-y-1 text-sm">
          <p className="text-blue-600 dark:text-blue-400">
            <span className="font-medium">Boards Created:</span> {data.boardsCreated}
          </p>
          <p className="text-green-600 dark:text-green-400">
            <span className="font-medium">Users Created:</span> {data.usersCreated}
          </p>
          <p className="text-purple-600 dark:text-purple-400">
            <span className="font-medium">Organizations Created:</span> {data.orgsCreated}
          </p>
          <p className="text-orange-600 dark:text-orange-400">
            <span className="font-medium">Notes Created:</span> {data.notesCreated}
          </p>
          <p className="text-red-600 dark:text-red-400">
            <span className="font-medium">Checklist Items Created:</span>{" "}
            {data.checklistItemsCreated}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function StatsSection() {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStatsData[]>([]);
  const [totals, setTotals] = useState<TotalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const { weeklyStats, totals } = await response.json();
        setWeeklyStats(weeklyStats);
        setTotals(totals);
      }
    } catch (error) {
      console.error("Error fetching weekly stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || weeklyStats.length === 0 || !totals) {
    return null;
  }

  const maxValue = Math.max(...weeklyStats.map((item) => item.boardsCreated));
  const yAxisMax = Math.ceil(maxValue * 1.1);

  return (
    <section className="py-16 bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Platform Growth</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Weekly boards created over time with platform growth metrics
          </p>
        </div>

        <Card className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Weekly Boards Created
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Hover over bars to see all metrics created that week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyStats}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="week"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    className="text-xs"
                  />
                  <YAxis domain={[0, yAxisMax]} className="text-xs" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="boardsCreated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6">
          <Card className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 w-full lg:w-auto lg:min-w-[180px]">
            <CardHeader className="pb-2 text-center">
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Organizations
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.totalOrgs.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <ArrowRight className="hidden lg:block w-6 h-6 text-gray-400 dark:text-zinc-500" />

          <Card className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 w-full lg:w-auto lg:min-w-[180px]">
            <CardHeader className="pb-2 text-center">
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Users
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.totalUsers.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <ArrowRight className="hidden lg:block w-6 h-6 text-gray-400 dark:text-zinc-500" />

          <Card className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 w-full lg:w-auto lg:min-w-[180px]">
            <CardHeader className="pb-2 text-center">
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Boards
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.totalBoards.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <ArrowRight className="hidden lg:block w-6 h-6 text-gray-400 dark:text-zinc-500" />

          <Card className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 w-full lg:w-auto lg:min-w-[180px]">
            <CardHeader className="pb-2 text-center">
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Notes
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.totalNotes.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>

          <ArrowRight className="hidden lg:block w-6 h-6 text-gray-400 dark:text-zinc-500" />

          <Card className="bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 w-full lg:w-auto lg:min-w-[180px]">
            <CardHeader className="pb-2 text-center">
              <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
                Checklist Items
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                {totals.totalChecklistItems.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}
