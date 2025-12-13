import React, { useState, useEffect } from "react";
import { getAllItems } from "../../services/storageService";
import { Card } from "../shared/UIComponents";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const Statistics = () => {
  const [stats, setStats] = useState({
    total: 0,
    bySource: [] as any[],
    weekly: [] as any[],
  });

  useEffect(() => {
    getAllItems().then((items) => {
      const sourceCount = { extension: 0, mobile: 0, web: 0, smart_pen: 0 };
      const weekMap: Record<string, number> = {};

      items.forEach((item) => {
        const src = (item.deviceSource || "web") as keyof typeof sourceCount;
        if (sourceCount[src] !== undefined) sourceCount[src]++;

        const day = new Date(item.createdAt).toLocaleDateString("en-US", {
          weekday: "short",
        });
        weekMap[day] = (weekMap[day] || 0) + 1;
      });

      const pieData = Object.entries(sourceCount)
        .map(([name, value]) => ({
          name,
          value,
          color:
            name === "extension"
              ? "#4F46E5"
              : name === "mobile"
              ? "#06B6D4"
              : name === "web"
              ? "#10B981"
              : "#F59E0B",
        }))
        .filter((d) => d.value > 0);

      setStats({
        total: items.length,
        bySource: pieData,
        weekly: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
          (day) => ({ name: day, count: weekMap[day] || 0 })
        ),
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Research Statistics
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <span className="text-gray-500 text-sm">Total Items</span>
          <div className="text-3xl font-bold dark:text-white">
            {stats.total}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-80">
        <Card className="p-6">
          <h3 className="font-semibold mb-4 dark:text-white">
            Weekly Activity
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weekly}>
              <XAxis dataKey="name" fontSize={12} />
              <Tooltip />
              <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold mb-4 dark:text-white">
            Source Breakdown
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.bySource}
                dataKey="value"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
              >
                {stats.bySource.map((e, i) => (
                  <Cell key={i} fill={e.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs mt-2">
            {stats.bySource.map((d) => (
              <div key={d.name} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
