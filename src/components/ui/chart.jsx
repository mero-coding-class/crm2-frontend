import { createContext, useContext, useId } from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { cn } from "../../lib/utils.js";

const ChartContext = createContext(null);

const ChartContainer = ({ id, config, className, children, style, ...props }) => {
  const generatedId = useId().replace(/:/g, "");
  const chartId = id || generatedId;
  const colors = Object.entries(config || {}).reduce((variables, [key, item]) => {
    if (item.color) variables[`--color-${key}`] = item.color;
    return variables;
  }, {});

  return (
    <ChartContext.Provider value={config || {}}>
      <div
        data-chart={chartId}
        role="img"
        className={cn(
          "flex w-full justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-slate-400 [&_.recharts-cartesian-grid_line]:stroke-slate-100 [&_.recharts-layer]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-tooltip-cursor]:fill-slate-50",
          className
        )}
        style={{ ...colors, ...style }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
};

const ChartTooltipContent = ({ active, payload, label }) => {
  const config = useContext(ChartContext) || {};
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const series = config[entry.dataKey];
  const value = Number(entry.value) || 0;

  return (
    <div className="min-w-36 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
      <p className="mb-2 text-[11px] font-semibold text-slate-800">
        {label || entry.payload?.stage || series?.label || entry.name}
      </p>
      <div className="flex items-center justify-between gap-5">
        <span className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: series?.color || "#294998" }} />
          {series?.label || entry.name || "Schools"}
        </span>
        <span className="text-xs font-semibold tabular-nums text-slate-900">
          {value.toLocaleString("en-NP")}
        </span>
      </div>
    </div>
  );
};

export { ChartContainer, ChartTooltipContent, RechartsTooltip as ChartTooltip };
