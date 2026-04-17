import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RangeValue = "7d" | "30d" | "90d" | "all";

const RANGE_OPTIONS: { value: RangeValue; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "All" },
];

const memberChartConfig = {
  completedPoints: {
    label: "Completed points",
    color: "var(--chart-2)",
  },
  openAssignedPoints: {
    label: "Open assigned points",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const shareChartConfig = {
  outputSharePercent: {
    label: "Output share",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const trendChartConfig = {
  completedPoints: {
    label: "Completed points",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function truncateLabel(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function memberLabelMaxLength(memberCount: number): number {
  if (memberCount <= 4) return 28;
  if (memberCount <= 6) return 20;
  if (memberCount <= 8) return 16;
  return 12;
}

export function StatsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const memberships = useQuery(api.teams.myMemberships, {});
  const user = useQuery(api.auth.loggedInUser);
  const [range, setRange] = useState<RangeValue>("30d");
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);

  useEffect(() => {
    if (memberships === undefined) return;
    if (memberships.length === 0) {
      setSelectedTeamId(null);
      return;
    }
    const stillValid =
      selectedTeamId !== null && memberships.some((membership) => membership.teamId === selectedTeamId);
    if (!stillValid) {
      setSelectedTeamId(memberships[0].teamId);
    }
  }, [memberships, selectedTeamId]);

  const stats = useQuery(api.stats.overview, {
    range,
    teamId: selectedTeamId ?? undefined,
  });

  const teamChartData = useMemo(() => {
    if (!stats?.team) return [];
    return stats.team.members.map((member) => ({
      name: member.name || member.email || "Member",
      completedPoints: member.completedPoints,
      openAssignedPoints: member.openAssignedPoints,
      outputSharePercent: Number(member.outputSharePercent.toFixed(2)),
    }));
  }, [stats]);

  const outputShareData = useMemo(() => {
    if (!stats?.team) return [];
    return stats.team.members
      .filter((member) => member.outputSharePercent > 0)
      .map((member, index) => ({
        name: member.name || member.email || "Member",
        outputSharePercent: Number(member.outputSharePercent.toFixed(2)),
        fill: `var(--chart-${(index % 5) + 1})`,
      }));
  }, [stats]);
  const memberLabelLimit = memberLabelMaxLength(teamChartData.length);

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const dashboardQuery = search
                  ? search.startsWith("?")
                    ? search
                    : `?${search}`
                  : "";
                navigate(`/${dashboardQuery}`);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
              Tasks
            </Button>
            <span className="font-semibold text-foreground">Stats</span>
          </div>
          <UserMenu
            user={user ?? undefined}
            onAddTask={() => navigate("/")}
            onNewTeam={() => navigate("/")}
            onReminderSettings={() => navigate("/")}
            onOpenStats={() => navigate("/stats")}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6">
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Workload stats</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Compare weighted output using task points and team workload distribution.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {RANGE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={range === option.value ? "default" : "outline"}
                  onClick={() => setRange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
              <Select
                value={selectedTeamId ?? "none"}
                onValueChange={(value) =>
                  setSelectedTeamId(value === "none" ? null : (value as Id<"teams">))
                }
              >
                <SelectTrigger className="min-w-44">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team comparison</SelectItem>
                  {(memberships ?? []).map((membership) => (
                    <SelectItem key={membership.teamId} value={membership.teamId}>
                      {membership.teamName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
        </Card>

        {!stats ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">Loading stats...</CardContent>
          </Card>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <KpiCard label="My completed points" value={stats.personal.completedPoints.toFixed(0)} />
              <KpiCard label="My completions" value={stats.personal.completionCount.toString()} />
              <KpiCard
                label="Avg points/completion"
                value={stats.personal.averagePointsPerCompletion.toFixed(2)}
              />
              <KpiCard
                label="On-time rate (one-time)"
                value={
                  stats.personal.onTimeCompletionRate === null
                    ? "N/A"
                    : `${(stats.personal.onTimeCompletionRate * 100).toFixed(1)}%`
                }
              />
            </section>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">My weighted trend</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.personal.trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No completions in this range yet. Try widening the period.
                  </p>
                ) : (
                  <ChartContainer config={trendChartConfig} className="aspect-auto h-[220px] w-full">
                    <LineChart data={stats.personal.trend} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="bucket" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                      <ChartTooltip
                        content={({ content: _content, ...props }) => (
                          <ChartTooltipContent {...props} />
                        )}
                      />
                      <Line
                        dataKey="completedPoints"
                        type="monotone"
                        stroke="var(--color-completedPoints)"
                        strokeWidth={2}
                        dot={
                          stats.personal.trend.length === 1
                            ? {
                                r: 4,
                                fill: "var(--color-completedPoints)",
                                stroke: "var(--background)",
                                strokeWidth: 1,
                              }
                            : false
                        }
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {stats.team ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Team balance: {stats.team.teamName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-3">
                    <KpiInline label="Team completed points" value={stats.team.totalCompletedPoints.toFixed(0)} />
                    <KpiInline label="Team completions" value={stats.team.totalCompletions.toString()} />
                    <KpiInline
                      label="Balance ratio"
                      value={stats.team.balanceRatio === null ? "N/A" : `${stats.team.balanceRatio.toFixed(2)}x`}
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Completed points by member</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {teamChartData.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No team completions in range.</p>
                      ) : (
                        <ChartContainer config={memberChartConfig} className="aspect-auto h-[280px] w-full">
                          <BarChart data={teamChartData} accessibilityLayer>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="name"
                              tickLine={false}
                              axisLine={false}
                              interval="preserveStartEnd"
                              angle={0}
                              textAnchor="middle"
                              height={40}
                              minTickGap={14}
                              tickFormatter={(value: string) => truncateLabel(value, memberLabelLimit)}
                            />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                            <ChartTooltip
                              content={({ content: _content, ...props }) => (
                                <ChartTooltipContent {...props} />
                              )}
                            />
                            <Bar
                              dataKey="completedPoints"
                              fill="var(--color-completedPoints)"
                              radius={4}
                            />
                          </BarChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Output share</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {outputShareData.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No share data yet.</p>
                      ) : (
                        <ChartContainer config={shareChartConfig} className="aspect-auto h-[280px] w-full">
                          <PieChart accessibilityLayer>
                            <Pie
                              data={outputShareData}
                              dataKey="outputSharePercent"
                              nameKey="name"
                              innerRadius={52}
                              outerRadius={92}
                            >
                              <Label
                                content={({ viewBox }) => {
                                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) {
                                    return null;
                                  }
                                  return (
                                    <text
                                      x={viewBox.cx}
                                      y={viewBox.cy}
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                    >
                                      <tspan
                                        x={viewBox.cx}
                                        y={(viewBox.cy ?? 0) - 12}
                                        dy="0"
                                        className="fill-foreground text-2xl font-semibold"
                                      >
                                        {stats.team.totalCompletedPoints.toFixed(0)}
                                      </tspan>
                                      <tspan
                                        x={viewBox.cx}
                                        dy="1.7em"
                                        className="fill-muted-foreground text-[11px]"
                                      >
                                        team points
                                      </tspan>
                                    </text>
                                  );
                                }}
                              />
                            </Pie>
                            <ChartTooltip
                              content={({ content: _content, ...props }) => (
                                <ChartTooltipContent {...props} hideLabel />
                              )}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                          </PieChart>
                        </ChartContainer>
                      )}

                      <div className="mt-6 overflow-x-auto border-t pt-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="py-2 pr-4 font-medium">Member</th>
                              <th className="py-2 pr-4 font-medium">Completed points</th>
                              <th className="py-2 pr-4 font-medium">Completions</th>
                              <th className="py-2 pr-4 font-medium">Open assigned points</th>
                              <th className="py-2 pr-0 font-medium">Output share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.team.members.map((member) => (
                              <tr key={member.userId} className="border-b last:border-b-0">
                                <td className="py-2 pr-4">
                                  {member.name || member.email || "Member"}
                                </td>
                                <td className="py-2 pr-4">{member.completedPoints.toFixed(0)}</td>
                                <td className="py-2 pr-4">{member.completionCount}</td>
                                <td className="py-2 pr-4">{member.openAssignedPoints.toFixed(0)}</td>
                                <td className="py-2 pr-0">{member.outputSharePercent.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Completed vs open assigned points</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {teamChartData.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No team members to compare yet.</p>
                    ) : (
                      <ChartContainer config={memberChartConfig} className="aspect-auto h-[280px] w-full">
                        <BarChart data={teamChartData} accessibilityLayer>
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                          <ChartTooltip
                            content={({ content: _content, ...props }) => (
                              <ChartTooltipContent {...props} />
                            )}
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar
                            dataKey="completedPoints"
                            fill="var(--color-completedPoints)"
                            radius={4}
                          />
                          <Bar
                            dataKey="openAssignedPoints"
                            fill="var(--color-openAssignedPoints)"
                            radius={4}
                          />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

              </>
            ) : (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">
                  No team selected. Choose a team to compare workload balance.
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function KpiInline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
