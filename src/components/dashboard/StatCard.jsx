import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,         // number: positive = up, negative = down, 0/null = neutral
  trendLabel,    // e.g. "vs last month"
  colorClass = "text-[#294998] bg-[#EDF2FC]",
  accentColor = "#294998",
}) => {
  const isUp = trend > 0;
  const isDown = trend < 0;
  const absT = Math.abs(trend || 0);

  return (
    <div className="bg-white rounded-[12px] border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-[0_4px_6px_-1px_rgba(15,23,42,0.07),_0_2px_4px_-2px_rgba(15,23,42,0.05)] hover:border-slate-300 transition-all duration-150">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-[500] text-slate-500 leading-[18px]">
          {title}
        </p>
        {Icon && (
          <div className={`h-8 w-8 rounded-[8px] flex items-center justify-center shrink-0 ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="flex items-end gap-3">
        <p className="text-[28px] font-[700] leading-[32px] tracking-[-0.02em] text-slate-900 tabular-nums">
          {value ?? "—"}
        </p>
        {trend !== null && trend !== undefined && (
          <div
            className={`flex items-center gap-0.5 mb-0.5 text-[12px] font-[600] leading-[16px] ${
              isUp
                ? "text-emerald-600"
                : isDown
                ? "text-rose-500"
                : "text-slate-400"
            }`}
          >
            {isUp ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : isDown ? (
              <TrendingDown className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {absT}%
          </div>
        )}
      </div>

      {(description || trendLabel) && (
        <p className="text-[12px] text-slate-400 leading-[16px]">
          {description || trendLabel}
        </p>
      )}
    </div>
  );
};

export default StatCard;
