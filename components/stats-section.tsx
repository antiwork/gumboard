"use client";

import React, { useState, useEffect } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface TotalsData {
  totalUsers: number;
  totalOrgs: number;
  totalBoards: number;
  totalNotes: number;
  totalChecklistItems: number;
}

export function StatsSection() {
  const [totals, setTotals] = useState<TotalsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (response.ok) {
        const { totals } = await response.json();
        setTotals(totals);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !totals) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Platform Growth</h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Platform metrics showing the progression from organizations to checklist items
          </p>
        </div>

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
